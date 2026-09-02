
import ReplayConsole from './replay-console';

export default function PcPage() {
  return (
    <main className="replay-page">
      <a className="skip-link" href="#replay-main">跳到主要内容</a>
      <header className="replay-header">
        <a className="replay-brand" href="/" aria-label="返回 TwinGuard 首页">
          <span className="replay-brand-mark" aria-hidden="true">T</span>
          <span><strong>TwinGuard</strong><small>居家风险守护</small></span>
        </a>
        <div className="replay-header-state"><span><i />守护系统就绪</span><b>在线</b></div>
        <a className="replay-header-link" href="/">返回产品入口</a>
      </header>

      <div id="replay-main" className="replay-shell">
        <section className="replay-intro">
          <div>
            <p>线上守护</p>
            <h1>居家风险守护</h1>
          </div>
          <p>同步查看视频、人体姿态、风险因子和预警状态，逐帧同步呈现离线推理结果。打开页面即可体验完整守护流程，无需下载安装。</p>
        </section>

        <ReplayConsole />
      </div>
    </main>
  );
}
