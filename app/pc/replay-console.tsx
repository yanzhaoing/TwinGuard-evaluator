'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

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
const skeleton: [number, number][] = [
  [0, 1], [0, 2], [1, 3], [2, 4], [5, 6], [5, 7], [7, 9],
  [6, 8], [8, 10], [5, 11], [6, 12], [11, 12], [11, 13],
  [13, 15], [12, 14], [14, 16],
];

const actionLabels: Record<string, string> = {
  continue_monitoring: '持续监测',
  extend_observation: '延长观察',
  track_and_record: '跟踪并记录',
  start_emergency_response: '启动应急处置',
  emergency_response: '进入应急响应',
};

const guardLabels: Record<string, string> = {
  normal_guard: '稳定监测',
  state_fluctuation: '检测到状态波动',
  multimodal_review: '证据复核中',
  confirmed_high_risk: '已确认高风险',
  warning_guard: '风险提示',
  suspected_guard: '疑似事件',
  confirmed_guard: '完整确认',
};

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

function interpolatedPoseFrame(frames: ReplayFrame[], time: number) {
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
  const poseFrame = useMemo(
    () => activeCase ? interpolatedPoseFrame(activeCase.frames, currentTime) : null,
    [activeCase, currentTime],
  );

  useEffect(() => {
    if (!playing) return;
    const video = videoRef.current;
    if (!video) return;

    if (typeof video.requestVideoFrameCallback === 'function') {
      let callbackId = 0;
      const update: VideoFrameRequestCallback = (_now, metadata) => {
        setCurrentTime(metadata.mediaTime);
        if (!video.paused && !video.ended) callbackId = video.requestVideoFrameCallback(update);
      };
      callbackId = video.requestVideoFrameCallback(update);
      return () => video.cancelVideoFrameCallback(callbackId);
    }

    let raf = 0;
    const update = () => {
      setCurrentTime(video.currentTime);
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeCase) return;
    video.pause();
    video.load();
    const start = previewStart(activeCase);
    video.currentTime = start;
    setCurrentTime(start);
    setPlaying(false);
  }, [activeCase]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed;
  }, [speed]);

  if (error) return <div className="replay-error" role="alert">{error}</div>;
  if (!payload || !activeCase || !frame || !poseFrame) return <div className="replay-loading"><i /><span>正在校验并载入回放结果</span></div>;

  const risk = frame.riskScore ?? 0;
  const rapid = (frame.rapidScore ?? 0) * 100;
  const timelinePoints = activeCase.frames.map((item) => {
    const x = (item.t / activeCase.duration) * 1000;
    const y = 126 - clamp(item.riskScore ?? 0) * 1.02;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const eventTime = activeCase.firstWarning ?? activeCase.instabilityStart ?? 0;
  const gateSteps = [
    { label: '持续监测', detail: '基线状态', time: 0, active: !frame.warning && !frame.suspected && !frame.complete },
    { label: '风险提示', detail: '延长观察', time: activeCase.firstWarning, active: frame.warning || frame.warningLatched },
    { label: '疑似事件', detail: '跟踪记录', time: activeCase.firstSuspected, active: frame.suspected },
    { label: '完整确认', detail: '应急响应', time: activeCase.firstComplete, active: frame.complete || frame.emergency },
  ];

  const seek = (time: number) => {
    const next = clamp(time, 0, activeCase.duration);
    if (videoRef.current) videoRef.current.currentTime = next;
    setCurrentTime(next);
  };
  const togglePlayback = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      try {
        await video.play();
      } catch {
        setPlaying(false);
      }
    } else {
      video.pause();
    }
  };
  const cycleSpeed = () => {
    const next = speed === 1 ? 0.5 : speed === 0.5 ? 1.5 : 1;
    setSpeed(next);
    if (videoRef.current) videoRef.current.playbackRate = next;
  };

  return (
    <section className="replay-console" aria-label="线上守护">
      <div className="replay-casebar">
        <div className="case-tabs" role="tablist" aria-label="选择回放案例">
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
        <div className="replay-integrity"><i /><span>冻结运行时</span><b>{payload.runtime.name.replace('TwinGuard ', '')}</b></div>
      </div>

      <div className="replay-grid">
        <div className="replay-stage-column">
          <div className="video-stage">
            <video
              ref={videoRef}
              muted
              playsInline
              preload="metadata"
              src={`${basePath}${activeCase.video}`}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
              onLoadedData={(event) => {
                const video = event.currentTarget;
                if (typeof video.requestVideoFrameCallback === 'function') {
                  video.requestVideoFrameCallback((_now, metadata) => setCurrentTime(metadata.mediaTime));
                } else setCurrentTime(video.currentTime);
              }}
              onSeeked={(event) => {
                const video = event.currentTarget;
                if (typeof video.requestVideoFrameCallback === 'function') {
                  video.requestVideoFrameCallback((_now, metadata) => setCurrentTime(metadata.mediaTime));
                } else setCurrentTime(video.currentTime);
              }}
              onTimeUpdate={(event) => {
                if (typeof event.currentTarget.requestVideoFrameCallback !== 'function') {
                  setCurrentTime(event.currentTarget.currentTime);
                }
              }}
              aria-label={`${activeCase.title}原始视频`}
            />
            <svg className="pose-layer" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
              {poseFrame.bbox && (
                <rect
                  x={poseFrame.bbox[0] / activeCase.width}
                  y={poseFrame.bbox[1] / activeCase.height}
                  width={(poseFrame.bbox[2] - poseFrame.bbox[0]) / activeCase.width}
                  height={(poseFrame.bbox[3] - poseFrame.bbox[1]) / activeCase.height}
                  className="pose-box"
                />
              )}
              {skeleton.map(([from, to]) => {
                const a = poseFrame.pose[from];
                const b = poseFrame.pose[to];
                if (!a || !b || a[2] < .28 || b[2] < .28) return null;
                return <line key={`${from}-${to}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} className="pose-bone" />;
              })}
              {poseFrame.pose.map((point, index) => point[2] >= .28
                ? <circle key={index} cx={point[0]} cy={point[1]} r="0.006" className="pose-joint" />
                : null)}
            </svg>
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
              step="0.01"
              value={currentTime}
              onChange={(event) => seek(Number(event.target.value))}
              aria-label="回放时间轴"
            />
            <button className="speed-control" type="button" onClick={cycleSpeed}>{speed.toFixed(1)}×</button>
            <button className="event-control" type="button" onClick={() => seek(Math.max(0, eventTime - 1.4))}>跳到关键段</button>
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

        <aside className="telemetry-panel" aria-label="当前时点推理参数">
          <div className="risk-overview">
            <div className="risk-ring" style={{'--risk': `${risk * 3.6}deg`} as React.CSSProperties}>
              <span><b>{frame.riskAvailable ? Math.round(risk) : '—'}</b><small>/ 100</small></span>
            </div>
            <div>
              <p>当前风险分</p>
              <h2>{guardLabels[frame.guardState] ?? '状态待解析'}</h2>
              <span>{actionLabels[frame.action] ?? '处置状态待解析'}</span>
            </div>
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
              <div><dt>RapidFall</dt><dd>{frame.rapidScore === null ? '—' : `${Math.round(rapid)}%`}</dd></div>
              <div><dt>下降量</dt><dd>{formatMetric(frame.descent)}</dd></div>
              <div><dt>下降速度</dt><dd>{formatMetric(frame.descentSpeed)}</dd></div>
              <div><dt>姿态旋转</dt><dd>{formatMetric(frame.rotation)}</dd></div>
              <div><dt>轨迹连续</dt><dd>{frame.continuity === null ? '—' : `${Math.round(frame.continuity * 100)}%`}</dd></div>
            </dl>
          </div>

          <div className={`case-result ${activeCase.kind}`}>
            <p>整段结果</p>
            {activeCase.kind === 'fall' ? (
              <>
                <h3>完整确认早于触地 {(activeCase.groundContact! - activeCase.firstComplete!).toFixed(3)} 秒</h3>
                <span>风险提示早于触地 {(activeCase.groundContact! - activeCase.firstWarning!).toFixed(3)} 秒；本案例进入应急响应。</span>
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
        <span>样本文件 <code>{activeCase.sourceSha256.slice(0, 12)}…</code></span>
        <span>结果只对应当前公开案例，不外推为长期误报率。</span>
      </footer>
    </section>
  );
}
