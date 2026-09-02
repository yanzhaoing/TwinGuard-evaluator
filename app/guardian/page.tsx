'use client';


import { useState } from 'react';

type CareState = 'pending' | 'safe' | 'follow';

export default function GuardianPage() {
  const [careState, setCareState] = useState<CareState>('pending');

  function explainCall() {
    window.alert('试用模式：不会拨打电话。');
  }

  return (
    <main className="guardian-page">
      <a className="skip-link" href="#guardian-main">跳到主要内容</a>
      <header className="mobile-header guardian-header">
        <a href="/" aria-label="返回 TwinGuard 首页">TwinGuard</a>
        <span>家属通知端</span>
      </header>

      <div id="guardian-main" className="guardian-shell">
        <div className="trial-note" role="note"><b>试用模式</b><span>操作只保存在当前页面</span></div>

        <section className="person-status" aria-labelledby="guardian-title">
          <div className="avatar" aria-hidden="true">家</div>
          <div>
            <p>家属通知端</p>
            <h1 id="guardian-title">老人居家守护</h1>
            <span><i aria-hidden="true" /> 设备在线 · 守护中</span>
          </div>
        </section>

        <section className="guardian-card" aria-labelledby="care-title">
          <div className="card-row">
            <div>
              <p>当前状态</p>
              <h2 id="care-title">老人当前安全</h2>
            </div>
            <span className="plain-status success">正常</span>
          </div>
          <dl className="guardian-facts">
            <div><dt>视频设备</dt><dd>在线</dd></div>
            <div><dt>守护状态</dt><dd>守护中</dd></div>
            <div><dt>待处理通知</dt><dd>1 条新通知</dd></div>
          </dl>
        </section>

        <section className="guardian-card" aria-labelledby="notice-title">
          <div className="card-row">
            <div>
              <p>最新通知</p>
              <h2 id="notice-title">检测到疑似跌倒风险</h2>
            </div>
            <span className="plain-status success">待确认</span>
          </div>
          <p className="guardian-copy">系统发现快速下降和倒地姿态，已生成风险记录。请联系老人确认情况，并在下方记录处置结果。</p>

          {careState === 'pending' ? (
            <div className="guardian-actions" aria-label="处置操作">
              <button type="button" className="primary-action" onClick={() => setCareState('safe')}>已联系，老人安全</button>
              <button type="button" className="secondary-action" onClick={() => setCareState('follow')}>需要继续处理</button>
              <button type="button" className="text-action" onClick={explainCall}>给老人打电话</button>
            </div>
          ) : (
            <div className={`care-result ${careState === 'safe' ? 'is-safe' : 'is-follow'}`} role="status">
              <strong>{careState === 'safe' ? '✓ 已记录：老人安全' : '! 已记录：继续跟进'}</strong>
              <button type="button" onClick={() => setCareState('pending')}>修改处理结果</button>
            </div>
          )}
        </section>

        <a className="guardian-link" href="/pc/">查看线上守护 →</a>
      </div>
    </main>
  );
}
