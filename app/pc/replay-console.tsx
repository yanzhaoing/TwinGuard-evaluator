'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type PosePoint = [number, number, number];
type ReplayFrame = {
  t: number;
  accepted: boolean;
  person: boolean;
  pose: PosePoint[];
  bbox: [number, number, number, number] | null;
  poseQuality: number | null;
  activity: string;
  riskAvailable: boolean;
  riskScore: number | null;
  rapidScore: number | null;
  descent: number | null;
  descentSpeed: number | null;
  rotation: number | null;
  continuity: number | null;
  trackVerified: boolean;
  warning: boolean;
  warningLatched: boolean;
  suspected: boolean;
  complete: boolean;
  emergency: boolean;
  guardState: string;
  action: string;
  route: string;
};

type ReplayCase = {
  id: string;
  kind: 'fall' | 'normal';
  title: string;
  subtitle: string;
  video: string;
  sourceSha256: string;
  width: number;
  height: number;
  analysisFps: number;
  duration: number;
  sampleCount: number;
  instabilityStart: number | null;
  groundContact: number | null;
  firstWarning: number | null;
  firstSuspected: number | null;
  firstComplete: number | null;
  firstEmergency: number | null;
  warningEpisodes: number;
  suspectedEpisodes: number;
  completeEpisodes: number;
  frames: ReplayFrame[];
};

type ReplayPayload = {
  schema: string;
  mode: string;
  boundary: string;
  runtime: {
    name: string;
    artifactSha256: string;
    motionDecisionSha256: string;
  };
  cases: ReplayCase[];
};

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const SKELETON: [number, number][] = [
  [0, 1], [0, 2], [1, 3], [2, 4], [5, 6], [5, 7], [7, 9],
  [6, 8], [8, 10], [5, 11], [6, 12], [11, 12], [11, 13],
  [13, 15], [12, 14], [14, 16],
];
const JOINT_CONF = 0.28;

const actionLabels: Record<string, string> = {
  continue_monitoring: '持续监测',
  extend_observation: '延长观察',
  track_and_record: '跟踪并记录',
  start_emergency_response: '启动应急处置',
  emergency_response: '进入应急响应',
};

const notifyByAction: Record<string, string> = {
  continue_monitoring: '不通知家属 · 持续监测',
  extend_observation: '暂不通知 · 延长观察',
  track_and_record: '记录事件证据 · 准备通知',
  start_emergency_response: '已通知家属通知端 · 启动应急处置',
  emergency_response: '已通知家属通知端 · 应急响应中',
};

type StageKey = 'normal' | 'warning' | 'review' | 'suspected' | 'confirmed';
const stageLabels: Record<StageKey, string> = {
  normal: '正常监测',
  warning: '风险提示',
  review: '复核观察中',
  suspected: '疑似事件',
  confirmed: '确认告警',
};
type ToneKey = 'ok' | 'warn' | 'alert' | 'danger';
const stageTones: Record<StageKey | 'recovered', ToneKey> = {
  normal: 'ok',
  warning: 'warn',
  review: 'warn',
  suspected: 'alert',
  confirmed: 'danger',
  recovered: 'ok',
};

// A frame counts as "incident" when either the gate flags or the runtime guard
// state machine say the person is not at baseline. Severity splits the ladder:
// severe = suspected or worse (drives 告警解除), watch = warning-level (风险解除).
const isIncidentFrame = (frame: ReplayFrame) => (
  frame.warning || frame.warningLatched || frame.suspected || frame.complete || frame.emergency
  || frame.guardState !== 'normal_guard'
);
const isSevereFrame = (frame: ReplayFrame) => (
  frame.suspected || frame.complete || frame.emergency || frame.guardState === 'confirmed_high_risk'
);
const isWarnFrame = (frame: ReplayFrame) => (
  frame.warning || frame.warningLatched || frame.guardState === 'state_fluctuation'
);

function stageOfFrame(frame: ReplayFrame): StageKey {
  if (frame.complete || frame.emergency || frame.guardState === 'confirmed_high_risk') return 'confirmed';
  if (frame.suspected) return 'suspected';
  if (frame.guardState === 'multimodal_review') return 'review';
  if (frame.warning || frame.warningLatched || frame.guardState === 'state_fluctuation') return 'warning';
  return 'normal';
}

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const formatTime = (seconds: number) => {
  const safe = Math.max(0, seconds || 0);
  return `${Math.floor(safe / 60).toString().padStart(2, '0')}:${Math.floor(safe % 60).toString().padStart(2, '0')}.${Math.floor((safe % 1) * 10)}`;
};
const formatMetric = (value: number | null, digits = 2) => value === null ? '—' : value.toFixed(digits);

function nearestFrame(frames: ReplayFrame[], time: number) {
  if (!frames.length) return null;
  let low = 0;
  let high = frames.length - 1;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (frames[mid].t < time) low = mid + 1;
    else high = mid;
  }
  if (low > 0 && Math.abs(frames[low - 1].t - time) < Math.abs(frames[low].t - time)) return frames[low - 1];
  return frames[low];
}

function poseAt(frames: ReplayFrame[], time: number) {
  const fallback = nearestFrame(frames, time);
  if (!fallback || frames.length < 2) return fallback;

  let rightIndex = 0;
  while (rightIndex < frames.length && frames[rightIndex].t < time) rightIndex += 1;
  if (rightIndex === 0 || rightIndex >= frames.length) return fallback;

  const left = frames[rightIndex - 1];
  const right = frames[rightIndex];
  const gap = right.t - left.t;
  if (
    gap <= 0 || gap > 0.25
    || !left.person || !right.person
    || !left.bbox || !right.bbox
    || left.pose.length === 0 || left.pose.length !== right.pose.length
  ) return fallback;

  const ratio = clamp((time - left.t) / gap, 0, 1);
  const mix = (from: number, to: number) => from + (to - from) * ratio;
  return {
    ...fallback,
    bbox: left.bbox.map((value, index) => mix(value, right.bbox![index])) as ReplayFrame['bbox'],
    pose: left.pose.map((point, index) => [
      mix(point[0], right.pose[index][0]),
      mix(point[1], right.pose[index][1]),
      mix(point[2], right.pose[index][2]),
    ] as PosePoint),
  };
}

function previewStart(replayCase: ReplayCase) {
  const anchor = replayCase.kind === 'fall'
    ? Math.max(0, (replayCase.instabilityStart ?? replayCase.firstWarning ?? 0) - 1.2)
    : Math.max(0, (replayCase.firstWarning ?? 0) - 0.5);
  const visibleFrames = replayCase.frames.filter((item) => item.person && item.pose.length > 0);
  if (!visibleFrames.length) return anchor;
  return visibleFrames.reduce((best, item) => (
    Math.abs(item.t - anchor) < Math.abs(best.t - anchor) ? item : best
  )).t;
}

export default function ReplayConsole() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const activeCaseRef = useRef<ReplayCase | null>(null);
  const timeRef = useRef(0);
  const lastPushRef = useRef(-1);
  const speedRef = useRef(1);
  const [payload, setPayload] = useState<ReplayPayload | null>(null);
  const [activeId, setActiveId] = useState('forward-fall');
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${basePath}/replay/replay-v9.7.json`)
      .then((response) => {
        if (!response.ok) throw new Error('结果文件加载失败');
        return response.json();
      })
      .then((data) => setPayload(data as ReplayPayload))
      .catch(() => setError('回放数据未能加载，请刷新页面重试。'));
  }, []);

  const activeCase = useMemo(
    () => payload?.cases.find((item) => item.id === activeId) ?? payload?.cases[0] ?? null,
    [payload, activeId],
  );
  const frame = useMemo(
    () => activeCase ? nearestFrame(activeCase.frames, currentTime) : null,
    [activeCase, currentTime],
  );

  const caseStats = useMemo(() => {
    if (!activeCase) return null;
    // Episode boundaries from the data itself: an episode runs while frames are
    // non-baseline (gate flags or guard state machine); it ends at the first
    // baseline frame. Severe (suspected+) and warning-level episodes are tracked
    // separately so the recovery label matches what actually happened.
    let severeEndAt: number | null = null;
    let warnEndAt: number | null = null;
    let severeOpen = false;
    let warnOpen = false;
    const maxFactor = { rapidScore: 0, descent: 0, descentSpeed: 0, rotation: 0 };
    for (const item of activeCase.frames) {
      if (isSevereFrame(item)) { severeOpen = true; severeEndAt = null; }
      else if (severeOpen && !isIncidentFrame(item)) { severeEndAt = item.t; severeOpen = false; }
      if (isWarnFrame(item)) { warnOpen = true; warnEndAt = null; }
      else if (warnOpen && !isIncidentFrame(item)) { warnEndAt = item.t; warnOpen = false; }
      if (item.rapidScore !== null) maxFactor.rapidScore = Math.max(maxFactor.rapidScore, item.rapidScore);
      if (item.descent !== null) maxFactor.descent = Math.max(maxFactor.descent, item.descent);
      if (item.descentSpeed !== null) maxFactor.descentSpeed = Math.max(maxFactor.descentSpeed, item.descentSpeed);
      if (item.rotation !== null) maxFactor.rotation = Math.max(maxFactor.rotation, item.rotation);
    }
    return { severeEndAt, warnEndAt, maxFactor };
  }, [activeCase]);

  const timelinePoints = useMemo(() => {
    if (!activeCase) return '';
    return activeCase.frames.map((item) => {
      const x = (item.t / activeCase.duration) * 1000;
      const y = 126 - clamp(item.riskScore ?? 0) * 1.02;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }, [activeCase]);

  const draw = useCallback((mediaTime: number) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    const replayCase = activeCaseRef.current;
    if (!video || !canvas || !stage || !replayCase) return;

    const stageRect = stage.getBoundingClientRect();
    const videoRect = video.getBoundingClientRect();
    const sourceWidth = video.videoWidth || replayCase.width;
    const sourceHeight = video.videoHeight || replayCase.height;
    if (!sourceWidth || !sourceHeight || videoRect.width === 0 || videoRect.height === 0) return;

    // Exact object-fit: contain geometry — the content box the video frames occupy.
    const scale = Math.min(videoRect.width / sourceWidth, videoRect.height / sourceHeight);
    const contentWidth = sourceWidth * scale;
    const contentHeight = sourceHeight * scale;
    const contentLeft = videoRect.left - stageRect.left + (videoRect.width - contentWidth) / 2;
    const contentTop = videoRect.top - stageRect.top + (videoRect.height - contentHeight) / 2;

    const dpr = window.devicePixelRatio || 1;
    const pixelWidth = Math.max(1, Math.round(contentWidth * dpr));
    const pixelHeight = Math.max(1, Math.round(contentHeight * dpr));
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    canvas.style.left = `${contentLeft}px`;
    canvas.style.top = `${contentTop}px`;
    canvas.style.width = `${contentWidth}px`;
    canvas.style.height = `${contentHeight}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, contentWidth, contentHeight);

    const poseFrame = poseAt(replayCase.frames, mediaTime);
    if (!poseFrame || !poseFrame.person || !poseFrame.pose.length || video.readyState < 2) return;

    const metricFrame = nearestFrame(replayCase.frames, mediaTime);
    const tone = metricFrame ? stageTones[stageOfFrame(metricFrame)] : 'ok';
    const toneColor = { ok: '#7df1bd', warn: '#ffd27d', alert: '#ffab7a', danger: '#ff8d85' }[tone];
    const toneGlow = {
      ok: 'rgba(103, 230, 170, .85)', warn: 'rgba(255, 210, 125, .85)',
      alert: 'rgba(255, 171, 122, .85)', danger: 'rgba(255, 141, 133, .9)',
    }[tone];

    const px = (point: PosePoint) => point[0] * contentWidth;
    const py = (point: PosePoint) => point[1] * contentHeight;

    if (poseFrame.bbox) {
      const [x1, y1, x2, y2] = poseFrame.bbox;
      ctx.save();
      ctx.strokeStyle = toneColor;
      ctx.globalAlpha = 0.75;
      ctx.lineWidth = 2;
      ctx.setLineDash([9, 6]);
      ctx.strokeRect(
        (x1 / sourceWidth) * contentWidth,
        (y1 / sourceHeight) * contentHeight,
        ((x2 - x1) / sourceWidth) * contentWidth,
        ((y2 - y1) / sourceHeight) * contentHeight,
      );
      ctx.restore();
    }

    ctx.save();
    ctx.strokeStyle = toneColor;
    ctx.lineWidth = Math.max(2.5, contentWidth * 0.0032);
    ctx.lineCap = 'round';
    ctx.shadowColor = toneGlow;
    ctx.shadowBlur = 7;
    for (const [from, to] of SKELETON) {
      const a = poseFrame.pose[from];
      const b = poseFrame.pose[to];
      if (!a || !b || a[2] < JOINT_CONF || b[2] < JOINT_CONF) continue;
      ctx.beginPath();
      ctx.moveTo(px(a), py(a));
      ctx.lineTo(px(b), py(b));
      ctx.stroke();
    }
    ctx.restore();

    const jointRadius = Math.max(3.5, contentWidth * 0.0058);
    ctx.save();
    ctx.fillStyle = '#f6fffa';
    ctx.strokeStyle = toneColor;
    ctx.lineWidth = 2;
    ctx.shadowColor = toneGlow;
    ctx.shadowBlur = 6;
    for (const point of poseFrame.pose) {
      if (point[2] < JOINT_CONF) continue;
      ctx.beginPath();
      ctx.arc(px(point), py(point), jointRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  const pushTime = useCallback((time: number, force = false) => {
    timeRef.current = time;
    draw(time);
    if (force || Math.abs(time - lastPushRef.current) >= 0.05) {
      lastPushRef.current = time;
      setCurrentTime(time);
    }
  }, [draw]);

  useEffect(() => {
    const video = videoRef.current;
    const stage = stageRef.current;
    const replayCase = activeCase;
    if (!video || !stage || !replayCase) return;

    activeCaseRef.current = replayCase;
    const start = previewStart(replayCase);
    timeRef.current = start;
    lastPushRef.current = start;
    setCurrentTime(start);
    setPlaying(false);
    clearCanvas();
    video.pause();
    video.playbackRate = speedRef.current;

    const seekToStart = () => { video.currentTime = start; };
    if (video.readyState >= 1) seekToStart();
    else video.addEventListener('loadedmetadata', seekToStart, { once: true });

    const onSeeked = () => pushTime(video.currentTime, true);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => { setPlaying(false); pushTime(video.currentTime, true); };
    const onLoadedData = () => draw(timeRef.current);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);
    video.addEventListener('loadeddata', onLoadedData);

    let stopped = false;
    let videoFrameId = 0;
    let rafId = 0;
    const useFrameCallback = typeof video.requestVideoFrameCallback === 'function';
    if (useFrameCallback) {
      const onVideoFrame: VideoFrameRequestCallback = (_now, metadata) => {
        if (stopped) return;
        pushTime(metadata.mediaTime);
        videoFrameId = video.requestVideoFrameCallback(onVideoFrame);
      };
      videoFrameId = video.requestVideoFrameCallback(onVideoFrame);
    } else {
      const loop = () => {
        if (stopped) return;
        pushTime(video.currentTime);
        rafId = requestAnimationFrame(loop);
      };
      rafId = requestAnimationFrame(loop);
    }

    const redraw = () => draw(timeRef.current);
    const observer = new ResizeObserver(redraw);
    observer.observe(stage);
    observer.observe(video);
    window.addEventListener('resize', redraw);

    return () => {
      stopped = true;
      if (useFrameCallback) video.cancelVideoFrameCallback(videoFrameId);
      else cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener('resize', redraw);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('loadeddata', onLoadedData);
    };
  }, [activeCase, draw, pushTime, clearCanvas]);

  if (error) return <div className="replay-error" role="alert">{error}</div>;
  if (!payload || !activeCase || !frame || !caseStats) {
    return <div className="replay-loading"><i /><span>正在载入守护数据</span></div>;
  }

  const risk = frame.riskScore ?? 0;
  const stage: StageKey = stageOfFrame(frame);
  const recoveredSevere = stage === 'normal'
    && caseStats.severeEndAt !== null
    && currentTime >= caseStats.severeEndAt;
  const recoveredWarn = stage === 'normal' && !recoveredSevere
    && caseStats.warnEndAt !== null
    && currentTime >= caseStats.warnEndAt;
  const recovered = recoveredSevere || recoveredWarn;
  const stageLabel = recoveredSevere ? '告警解除 · 恢复监测'
    : recoveredWarn ? '风险解除 · 恢复监测'
      : stageLabels[stage];
  const stageTone = recovered ? stageTones.recovered : stageTones[stage];
  const levelLabel = stage === 'confirmed' ? '高风险'
    : stage === 'suspected' ? '较高风险'
      : stage === 'review' ? '中风险 · 持续观察'
        : stage === 'warning' ? '中风险 · 关注'
          : '低风险';

  const factors = frame.riskAvailable ? ([
    { key: 'rapidScore', label: 'RapidFall 评分', value: frame.rapidScore, max: caseStats.maxFactor.rapidScore, text: frame.rapidScore === null ? '—' : `${Math.round(frame.rapidScore * 100)}%` },
    { key: 'descentSpeed', label: '下降速度', value: frame.descentSpeed, max: caseStats.maxFactor.descentSpeed, text: formatMetric(frame.descentSpeed) },
    { key: 'descent', label: '累计下降量', value: frame.descent, max: caseStats.maxFactor.descent, text: formatMetric(frame.descent) },
    { key: 'rotation', label: '姿态旋转', value: frame.rotation, max: caseStats.maxFactor.rotation, text: formatMetric(frame.rotation) },
  ]
    .filter((item) => item.value !== null && item.max > 0)
    .sort((a, b) => (b.value! / b.max) - (a.value! / a.max))
    .slice(0, 3)) : [];

  const eventTime = activeCase.firstWarning ?? activeCase.instabilityStart ?? 0;
  const gateSteps = [
    { label: '持续监测', detail: '基线状态', time: 0, active: stage === 'normal' },
    { label: '风险提示', detail: '延长观察', time: activeCase.firstWarning, active: stage === 'warning' || stage === 'review' },
    { label: '疑似事件', detail: '跟踪记录', time: activeCase.firstSuspected, active: stage === 'suspected' },
    { label: '完整确认', detail: '应急响应', time: activeCase.firstComplete, active: stage === 'confirmed' },
  ];

  const seek = (time: number) => {
    const video = videoRef.current;
    if (!video) return;
    const next = clamp(time, 0, activeCase.duration);
    video.currentTime = next;
    pushTime(next, true);
  };
  const togglePlayback = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused || video.ended) {
      if (video.ended) video.currentTime = 0;
      try {
        await video.play();
      } catch {
        setPlaying(false);
      }
    } else {
      video.pause();
    }
  };
  const replay = async () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    pushTime(0, true);
    try {
      await video.play();
    } catch {
      setPlaying(false);
    }
  };
  const cycleSpeed = () => {
    const next = speed === 1 ? 0.5 : speed === 0.5 ? 1.5 : 1;
    setSpeed(next);
    speedRef.current = next;
    if (videoRef.current) videoRef.current.playbackRate = next;
  };

  return (
    <section className="replay-console" aria-label="线上守护">
      <div className="replay-casebar">
        <div className="case-tabs" role="tablist" aria-label="选择守护案例">
          {payload.cases.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={item.id === activeCase.id}
              className={item.id === activeCase.id ? 'is-active' : ''}
              onClick={() => setActiveId(item.id)}
            >
              <i className={`case-dot ${item.kind}`} />
              <span><strong>{item.title}</strong><small>{item.kind === 'fall' ? '跌倒案例' : '日常活动'}</small></span>
            </button>
          ))}
        </div>
        <div className="replay-integrity"><i /><span>离线推理结果 · 逐帧同步呈现</span></div>
      </div>

      <div className="replay-grid">
        <div className="replay-stage-column">
          <div className="video-stage" ref={stageRef}>
            <video
              key={activeCase.id}
              ref={videoRef}
              muted
              playsInline
              preload="auto"
              src={`${basePath}${activeCase.video}`}
              aria-label={`${activeCase.title}原始视频`}
            />
            <canvas ref={canvasRef} className="pose-layer" aria-hidden="true" />
            <div className="video-topline">
              <span className="analysis-state"><i className={frame.person ? 'seen' : ''} />{frame.person ? '人体姿态已跟踪' : '等待可靠姿态'}</span>
              <code>{formatTime(currentTime)}</code>
            </div>
            <div className="video-caption">
              <span>{activeCase.subtitle}</span>
              <b>{frame.activity || '未识别'}</b>
            </div>
          </div>

          <div className="replay-controls">
            <button className="play-control" type="button" onClick={togglePlayback} aria-label={playing ? '暂停' : '播放'}>
              <span aria-hidden="true">{playing ? 'Ⅱ' : '▶'}</span>{playing ? '暂停' : '播放'}
            </button>
            <input
              type="range"
              min="0"
              max={activeCase.duration}
              step="0.05"
              value={currentTime}
              onChange={(event) => seek(Number(event.target.value))}
              aria-label="回放时间轴"
            />
            <button className="speed-control" type="button" onClick={cycleSpeed} aria-label="切换倍速">{speed.toFixed(1)}×</button>
            <button className="event-control" type="button" onClick={() => seek(Math.max(0, eventTime - 1.4))}>跳到关键段</button>
            <button className="event-control" type="button" onClick={replay}>重新播放</button>
          </div>

          <div className="risk-timeline">
            <div className="timeline-heading"><span>风险分时间轴</span><b>{formatTime(currentTime)} / {formatTime(activeCase.duration)}</b></div>
            <svg viewBox="0 0 1000 142" preserveAspectRatio="none" aria-label="风险分随时间变化曲线">
              <defs>
                <linearGradient id="riskArea" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#ffb85c" stopOpacity=".45" />
                  <stop offset="1" stopColor="#ffb85c" stopOpacity="0" />
                </linearGradient>
              </defs>
              <line x1="0" x2="1000" y1="34" y2="34" className="threshold-line" />
              <polyline points={`0,132 ${timelinePoints} 1000,132`} className="timeline-area" />
              <polyline points={timelinePoints} className="timeline-score" />
              {activeCase.instabilityStart !== null && <line x1={(activeCase.instabilityStart / activeCase.duration) * 1000} x2={(activeCase.instabilityStart / activeCase.duration) * 1000} y1="8" y2="136" className="event-line instability" />}
              {activeCase.groundContact !== null && <line x1={(activeCase.groundContact / activeCase.duration) * 1000} x2={(activeCase.groundContact / activeCase.duration) * 1000} y1="8" y2="136" className="event-line contact" />}
              <line x1={(currentTime / activeCase.duration) * 1000} x2={(currentTime / activeCase.duration) * 1000} y1="4" y2="138" className="cursor-line" />
            </svg>
            <div className="timeline-legend"><span className="legend-score">风险分</span>{activeCase.kind === 'fall' && <><span className="legend-instability">失稳开始</span><span className="legend-contact">触地</span></>}</div>
          </div>
        </div>

        <aside className="telemetry-panel" aria-label="当前时点守护参数">
          <div className="risk-overview">
            <div className={`risk-ring tone-${stageTone}`} style={{ '--risk': `${risk * 3.6}deg` } as React.CSSProperties}>
              <span><b>{frame.riskAvailable ? Math.round(risk) : '—'}</b><small>/ 100</small></span>
            </div>
            <div className="risk-overview-text">
              <p>当前风险分 · {levelLabel}</p>
              <h2><span className={`stage-chip tone-${stageTone}`} />{stageLabel}</h2>
              <span className="notify-line">{notifyByAction[frame.action] ?? actionLabels[frame.action] ?? '处置状态待解析'}</span>
            </div>
          </div>

          <div className="factor-panel">
            <p className="panel-kicker">主要贡献因子</p>
            {factors.length ? (
              <ul>
                {factors.map((item) => (
                  <li key={item.key}>
                    <span className="factor-label">{item.label}</span>
                    <span className="factor-bar"><i style={{ width: `${clamp((item.value! / item.max) * 100)}%` }} /></span>
                    <b>{item.text}</b>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="factor-empty">当前帧未输出风险因子，等待可靠人体姿态。</p>
            )}
          </div>

          <div className="gate-panel">
            <p className="panel-kicker">四级因果门控</p>
            <ol>
              {gateSteps.map((step, index) => {
                const reached = step.time !== null && currentTime >= step.time;
                return (
                  <li key={step.label} className={`${reached ? 'is-reached' : ''} ${step.active ? 'is-current' : ''}`}>
                    <span>{index + 1}</span>
                    <div><strong>{step.label}</strong><small>{step.time === null ? '未触发' : step.detail}</small></div>
                    <b>{step.time === null ? '—' : index === 0 ? '常态' : formatTime(step.time)}</b>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="metric-panel">
            <p className="panel-kicker">当前帧参数</p>
            <dl>
              <div><dt>姿态质量</dt><dd>{frame.poseQuality === null ? '—' : `${Math.round(frame.poseQuality * 100)}%`}</dd></div>
              <div><dt>RapidFall</dt><dd>{frame.rapidScore === null ? '—' : `${Math.round(frame.rapidScore * 100)}%`}</dd></div>
              <div><dt>下降量</dt><dd>{formatMetric(frame.descent)}</dd></div>
              <div><dt>下降速度</dt><dd>{formatMetric(frame.descentSpeed)}</dd></div>
              <div><dt>姿态旋转</dt><dd>{formatMetric(frame.rotation)}</dd></div>
              <div><dt>轨迹连续</dt><dd>{frame.continuity === null ? '—' : `${Math.round(clamp(frame.continuity, 0, 1) * 100)}%`}</dd></div>
            </dl>
          </div>

          <div className={`case-result ${activeCase.kind}`}>
            <p>整段结果</p>
            {activeCase.kind === 'fall' ? (
              <>
                <h3>完整确认早于触地 {(activeCase.groundContact! - activeCase.firstComplete!).toFixed(3)} 秒</h3>
                <span>风险提示早于触地 {(activeCase.groundContact! - activeCase.firstWarning!).toFixed(3)} 秒；本案例进入应急响应并通知家属通知端。</span>
              </>
            ) : (
              <>
                <h3>0 次完整确认 · 0 次应急响应</h3>
                <span>出现 {activeCase.warningEpisodes} 段低级观察提示，均被后续门控拦截，未升级为疑似事件。</span>
              </>
            )}
          </div>
        </aside>
      </div>

      <footer className="console-footer">
        <span>视频与逐帧数据来自本地离线推理结果，打开页面即可体验完整守护流程。</span>
        <span>TwinGuard 线上守护</span>
      </footer>
    </section>
  );
}
