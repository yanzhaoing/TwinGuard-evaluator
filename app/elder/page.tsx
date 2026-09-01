'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

type HelpState = 'idle' | 'countdown' | 'sent' | 'safe';

export default function ElderPage() {
  const [state, setState] = useState<HelpState>('idle');
  const [seconds, setSeconds] = useState(5);
  const liveRegion = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (state !== 'countdown') return;
    const timer = window.setInterval(() => {
      setSeconds((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          setState('sent');
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [state]);

  function startHelp() {
    setSeconds(5);
    setState('countdown');
  }

  function cancelHelp() {
    setSeconds(5);
    setState('idle');
  }

  function reportSafe() {
    setState('safe');
    window.setTimeout(() => setState('idle'), 3500);
  }

  function explainCall() {
    window.alert('体验模式：未拨打电话。');
  }

  return (
    <main className="elder-page">
      <a className="skip-link" href="#elder-main">跳到主要内容</a>
      <header className="mobile-header">
        <Link href="/" aria-label="返回 TwinGuard 首页">TwinGuard</Link>
        <span>老人端</span>
      </header>

      <div id="elder-main" className="elder-shell">
        <div className="trial-note" role="note"><b>试用模式</b><span>不会联系家属或拨打电话</span></div>

        <section className="elder-greeting" aria-labelledby="elder-title">
          <p>您好</p>
          <h1 id="elder-title">需要帮助就按红色按钮</h1>
        </section>

        <section className="help-zone" aria-label="紧急求助">
          {state === 'idle' || state === 'safe' ? (
            <button className="sos-button" type="button" onClick={startHelp}>
              <span aria-hidden="true">!</span>
              <strong>紧急求助</strong>
              <small>体验操作，不会通知家属</small>
            </button>
          ) : null}

          {state === 'countdown' ? (
            <div className="countdown-card" role="status" aria-live="assertive">
              <strong>{seconds}</strong>
              <p>秒后完成求助演示</p>
              <button type="button" onClick={cancelHelp}>取消，我按错了</button>
            </div>
          ) : null}

          {state === 'sent' ? (
            <div className="sent-card" role="status" aria-live="assertive">
              <span aria-hidden="true">✓</span>
              <h2>已模拟发出求助</h2>
              <p>请在安全的地方坐好，等待家属联系。</p>
              <button type="button" onClick={reportSafe}>我现在没事</button>
            </div>
          ) : null}

          <p ref={liveRegion} className="sr-only" aria-live="polite">
            {state === 'safe' ? '已报告平安' : ''}
          </p>
          {state === 'safe' ? <p className="safe-message" role="status">✓ 已记录：我现在没事</p> : null}
        </section>

        <section className="elder-actions" aria-label="常用操作">
          <button type="button" className="safe-action" onClick={reportSafe}>
            <span aria-hidden="true">✓</span><strong>我没事，报个平安</strong>
          </button>
          <button type="button" className="call-action" onClick={explainCall}>
            <span aria-hidden="true">☎</span><strong>给家属打电话</strong>
          </button>
        </section>
      </div>
    </main>
  );
}
