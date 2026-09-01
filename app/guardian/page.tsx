'use client';

import Link from 'next/link';
import { useState } from 'react';

type CareState = 'pending' | 'safe' | 'follow';

export default function GuardianPage() {
  const [careState, setCareState] = useState<CareState>('pending');

  function explainCall() {
    window.alert('体验模式：未拨打电话。');
  }

  return (
    <main className="guardian-page">
      <a className="skip-link" href="#guardian-main">跳到主要内容</a>
      <header className="mobile-header guardian-header">
        <Link href="/" aria-label="返回 TwinGuard 首页">TwinGuard</Link>
        <span>家属端</span>
      </header>

      <div id="guardian-main" className="guardian-shell">
        <div className="trial-note" role="note"><b>试用模式</b><span>操作只保存在当前页面</span></div>

        <section className="person-status" aria-labelledby="guardian-title">
          <div className="avatar" aria-hidden="true">家</div>
          <div>
            <p>居家守护</p>
            <h1 id="guardian-title">31分钟居家实测</h1>
            <span><i aria-hidden="true" /> 2026年8月27日 · 连续31分03秒</span>
          </div>
        </section>

        <section className="guardian-card" aria-labelledby="care-title">
          <div className="card-row">
            <div>
              <p>实测结果</p>
              <h2 id="care-title">日常活动，未见跌倒</h2>
            </div>
            <span className="plain-status success">已结束</span>
          </div>
          <dl className="guardian-facts">
            <div><dt>视频抽样</dt><dd>42个时点</dd></div>
            <div><dt>人工标注</dt><dd>38个有人，4个无人</dd></div>
            <div><dt>原系统误确认</dt><dd>1次，已定位</dd></div>
          </dl>
        </section>

        <section className="guardian-card" aria-labelledby="notice-title">
          <div className="card-row">
            <div>
              <p>家属通知</p>
              <h2 id="notice-title">微信联调消息已收到</h2>
            </div>
            <span className="plain-status success">送达</span>
          </div>
          <p className="guardian-copy">微信通知已送达（独立联调）。31分钟实测未发生跌倒，因此没有触发真实告警。确认高风险后，系统会保存发生时间、风险原因和对应录像。</p>

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

        <Link className="guardian-link" href="/pc">查看31分钟实测摘要 →</Link>
      </div>
    </main>
  );
}
