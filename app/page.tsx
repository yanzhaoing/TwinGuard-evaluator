

export default function Home() {
  return (
    <main>
      <a className="skip-link" href="#entries">跳到产品入口</a>
      <header className="topbar" aria-label="主导航">
        <a className="brand" href="#entries" aria-label="TwinGuard 首页">
          <span className="brand-mark" aria-hidden="true">T</span>
          <span>TwinGuard</span>
        </a>
        <nav>
          <a href="/pc/">线上守护</a>
          <a href="/elder/">老人端</a>
          <a href="/guardian/">家属通知端</a>
        </nav>
        <span className="verified"><span aria-hidden="true">●</span> 适老化 · 三端协同</span>
      </header>

      <section id="entries" className="entries-section entries-first" aria-labelledby="entries-title">
        <div className="section-heading">
          <p className="section-date">适老化产品入口</p>
          <h1 id="entries-title">电脑端守护，老人端求助，家属通知端处置</h1>
          <p>三个入口共享同一守护状态。请选择角色，直接体验对应功能。</p>
        </div>
        <div className="entry-grid">
          <a href="/elder/" className="entry-elder">
            <em>适老化设计</em>
            <strong>老人端</strong>
            <span>大字号、大按钮：一键求助、报平安、联系家属</span>
            <b>打开老人端 →</b>
          </a>
          <a href="/pc/">
            <strong>线上守护</strong>
            <span>同步查看视频、人体姿态、风险因子和预警状态</span>
            <b>进入线上守护 →</b>
          </a>
          <a href="/guardian/">
            <strong>家属通知端</strong>
            <span>接收通知、查看风险记录、确认处置</span>
            <b>打开家属通知端 →</b>
          </a>
        </div>
      </section>

      <section className="hero product-hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">TwinGuard 居家跌倒风险守护</p>
          <h2 id="hero-title">发现风险线索，<br />及时通知家属</h2>
          <p className="hero-lead">
            系统接入居家视频，在本地分析人体姿态和动作。老人无需学习复杂操作；需要帮助时可一键求助，家属可接收通知并完成处置。
          </p>
          <div className="hero-actions">
            <a className="button primary" href="/pc/">立即体验线上守护</a>
            <a className="button secondary" href="/elder/">查看老人端</a>
          </div>
          <p className="scope-note">公开体验内容已隐去人脸、联系方式、设备密钥和序列号。</p>
        </div>

        <aside className="status-panel spatial-card" aria-label="产品守护流程">
          <div className="spatial-signal" aria-hidden="true">
            <span className="signal-ring signal-ring-outer" />
            <span className="signal-ring signal-ring-middle" />
            <span className="signal-ring signal-ring-inner" />
            <span className="signal-core" />
          </div>
          <div className="status-content product-status">
            <div className="panel-head">
              <div>
                <p>产品守护流程</p>
                <strong>三端协同守护</strong>
              </div>
              <span className="status-ok">功能体验</span>
            </div>
            <ol className="product-flow">
              <li><span>01</span><strong>识别人体姿态与动作</strong></li>
              <li><span>02</span><strong>判断风险并持续确认</strong></li>
              <li><span>03</span><strong>通知家属并记录处置</strong></li>
            </ol>
          </div>
        </aside>
      </section>

      <footer className="site-footer">
        <strong>TwinGuard</strong>
        <span>居家跌倒风险守护</span>
      </footer>
    </main>
  );
}
