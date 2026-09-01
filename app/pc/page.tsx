import Link from 'next/link';
import ReplayConsole from './replay-console';

export default function PcPage() {
  return (
    <main className="replay-page">
      <a className="skip-link" href="#replay-main">跳到主要内容</a>
      <header className="replay-header">
        <Link className="replay-brand" href="/" aria-label="返回 TwinGuard 首页">
          <span className="replay-brand-mark" aria-hidden="true">T</span>
          <span><strong>TwinGuard</strong><small>居家风险守护</small></span>
        </Link>
        <div className="replay-header-state"><span><i />守护演示已就绪</span><b>在线</b></div>
        <Link className="replay-header-link" href="/">返回产品入口</Link>
      </header>

      <div id="replay-main" className="replay-shell">
        <section className="replay-intro">
          <div>
            <p>线上守护</p>
            <h1>居家风险实时看护</h1>
          </div>
          <p>同步查看视频、人体姿态、风险因子和预警状态。页面使用本地预先运行的结果进行同步演示，不要求下载安装。</p>
        </section>

        <ReplayConsole />
      </div>
    </main>
  );
}
