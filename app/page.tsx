/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const assetPath = (path: string) => `${basePath}${path}`;

const metrics = [
  { value: '31:03', label: '真实居家连续运行' },
  { value: '82', label: '外部跌倒序列冻结复验' },
  { value: '1,126', label: '公开工程序列分层回归' },
];

const pipeline = [
  ['01', '读取萤石视频画面'],
  ['02', '判断有人、无人和动作'],
  ['03', '计算画面风险分'],
  ['04', '低照时延长确认，心率随事件保存'],
  ['05', '确认高风险后录像并通知'],
];

export default function Home() {
  return (
    <main>
      <a className="skip-link" href="#main-content">跳到主要内容</a>
      <header className="topbar" aria-label="主导航">
        <a className="brand" href="#top" aria-label="TwinGuard 首页">
          <span className="brand-mark" aria-hidden="true">T</span>
          <span>TwinGuard</span>
        </a>
        <nav>
          <a href="#evidence">31分钟实测</a>
          <a href="#validation">冻结复验</a>
          <a href="#pipeline">处理流程</a>
          <a href="#entries">三个入口</a>
        </nav>
        <span className="verified"><span aria-hidden="true">●</span> 实测记录</span>
      </header>

      <section id="top" className="hero" aria-labelledby="hero-title">
        <div id="main-content" className="hero-copy">
          <p className="eyebrow">居家跌倒风险预警</p>
          <h1 id="hero-title">发现风险线索，<br />通知家属处理</h1>
          <p className="hero-lead">
            系统接入萤石视频流，在本地识别人、姿态和动作，并给出画面风险分。光线太暗时会延长确认；心率随事件保存，供家属查看。确认高风险后，系统保存脱敏片段并向家属发送微信通知。
          </p>
          <div className="hero-actions">
            <a className="button primary" href="#evidence">看31分钟实测</a>
            <a className="button secondary" href="#entries">打开三个入口</a>
          </div>
          <p className="scope-note">公开页面已隐去老人面部、联系方式、设备密钥和序列号。</p>
        </div>

        <aside className="status-panel spatial-card" aria-label="8月27日实测概览">
          <div className="spatial-signal" aria-hidden="true">
            <span className="signal-ring signal-ring-outer" />
            <span className="signal-ring signal-ring-middle" />
            <span className="signal-ring signal-ring-inner" />
            <span className="signal-core" />
          </div>
          <div className="status-content">
            <div className="panel-head">
              <div>
                <p>2026年8月27日 · 四川眉山</p>
                <strong>31分03秒连续运行</strong>
              </div>
              <span className="status-ok">采集完成</span>
            </div>
            <div className="metric-grid">
              {metrics.map((metric) => (
                <div className="metric" key={metric.label}>
                  <strong>{metric.value}</strong>
                  <span>{metric.label}</span>
                </div>
              ))}
            </div>
            <div className="stream-line">
              <span className="pulse" aria-hidden="true" />
              <div>
                <strong>萤石视频流 → 本地连续分析</strong>
                <p>42个视频时点均找到同场次分析记录</p>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section id="pipeline" className="pipeline-band" aria-labelledby="pipeline-title">
        <div>
          <p className="eyebrow">处理流程</p>
          <h2 id="pipeline-title">系统收到画面后，会做什么</h2>
        </div>
        <ol className="pipeline-list">
          {pipeline.map(([number, item]) => (
            <li key={number}>
              <span>{number}</span>
              <strong>{item}</strong>
            </li>
          ))}
        </ol>
        <p className="pipeline-note">风险分只看视频姿态。光线太暗时会多观察一会儿；心率只随事件保存，供家属查看，不参与评分或告警触发。</p>
      </section>

      <section id="validation" className="validation-section" aria-labelledby="validation-title">
        <div className="section-heading">
          <p className="section-date">冻结后一次性复验</p>
          <h2 id="validation-title">先冻结规则，再读取外部序列结果</h2>
          <p>页面展示当前v9.7分级门控的可追溯结果。不同数据集承担不同证据职责，不把短视频结果外推成长时居家性能。</p>
        </div>
        <div className="validation-grid">
          <article>
            <span>UP-Fall · 82段跌倒序列</span>
            <strong>63 / 82</strong>
            <p>风险提示严格早于冲击帧，占76.83%；序列结束前检出76/82（92.68%）。本地档案没有日常活动负样本，因此不报告误报率。</p>
          </article>
          <article>
            <span>UMAFall · 3段公开视频</span>
            <strong>3 / 3</strong>
            <p>风险提示与疑似事件均在触地前出现；完整确认与应急响应为2/3在触地前完成，平均相对触地提前0.033秒。</p>
          </article>
          <article>
            <span>FallVision · 已知工程复验组</span>
            <strong>412 / 684</strong>
            <p>跌倒疑似事件检出60.23%，非跌倒疑似事件2/442（0.45%）。该组不是历史盲测或独立验证。</p>
          </article>
        </div>
        <p className="boundary-note">边界说明：公开数据复验用于工程回归和触发时序检查，不代表临床诊断、真实跌倒预防效果或长期居家误报率。</p>
      </section>

      <section id="evidence" className="evidence-section" aria-labelledby="evidence-title">
        <div className="section-heading">
          <p className="section-date">8月27日居家实测</p>
          <h2 id="evidence-title">老人按日常习惯活动，系统连续运行31分03秒</h2>
          <p>记录采集于居家客厅。摄像头、心率计和光照传感器共用同一条时间轴。</p>
        </div>
        <div className="evidence-cards">
          <article>
            <span>01</span>
            <strong>2,252条传感器记录</strong>
            <p>摄像头留证42条、心率1,838条、环境光372条。</p>
          </article>
          <article>
            <span>02</span>
            <strong>9,012条分析记录</strong>
            <p>萤石连续视频流进入本地姿态与风险分析链路，其中5,957条得到可用风险分。</p>
          </article>
          <article>
            <span>03</span>
            <strong>抽查42个视频时点</strong>
            <p>42个时点均在同一场次的分析记录中找到对应项。</p>
          </article>
        </div>

        <div className="evidence-gallery" aria-label="脱敏实测证据">
          <figure className="wide-evidence">
            <img src={assetPath('/evidence/real_session_contact_sheet.jpg')} width="1600" height="1200" alt="31分钟居家实测的脱敏抽样画面" loading="lazy" decoding="async" />
            <figcaption>居家实测抽样画面。老人面部已处理，原始文件不在公开页面提供。</figcaption>
          </figure>
          <figure>
            <img src={assetPath('/evidence/wechat_delivery_redacted.jpg')} width="1224" height="1651" alt="家属微信收到系统联调通知的脱敏截图" loading="lazy" decoding="async" />
            <figcaption>家属收到的微信联调消息（联系方式已遮挡）。这条消息与31分钟无跌倒实测分开验证。</figcaption>
          </figure>
        </div>
      </section>

      <section className="platform-section" aria-labelledby="platform-title">
        <div className="section-heading">
          <p className="section-date">萤石开放平台</p>
          <h2 id="platform-title">视频接入使用本队账号和应用</h2>
          <p>视频通过本队萤石开放平台账号下的应用接入；AppKey、Secret和手机号已遮挡。</p>
        </div>
        <div className="platform-grid">
          <figure>
            <img src={assetPath('/evidence/ezviz_application_redacted.png')} width="1067" height="608" alt="萤石开放平台应用信息脱敏截图" loading="lazy" decoding="async" />
            <figcaption>应用信息</figcaption>
          </figure>
          <figure>
            <img src={assetPath('/evidence/ezviz_account_redacted.png')} width="1067" height="608" alt="萤石开放平台账号归属脱敏截图" loading="lazy" decoding="async" />
            <figcaption>账号归属</figcaption>
          </figure>
          <figure>
            <img src={assetPath('/evidence/ezviz_platform_overview.png')} width="1067" height="608" alt="萤石开放平台页面截图" loading="lazy" decoding="async" />
            <figcaption>平台页面</figcaption>
          </figure>
        </div>
      </section>

      <section id="entries" className="entries-section" aria-labelledby="entries-title">
        <div className="section-heading">
          <p className="section-date">三个使用入口</p>
          <h2 id="entries-title">电脑端看全局，老人端求助，家属端处置</h2>
        </div>
        <div className="entry-grid">
          <Link href="/pc"><strong>电脑管理台</strong><span>查看画面、动作、风险因子和处置记录</span><b>打开电脑端 →</b></Link>
          <Link href="/elder"><strong>老人端</strong><span>一键求助、报平安、联系家属</span><b>打开老人端 →</b></Link>
          <Link href="/guardian"><strong>家属端</strong><span>接收告警、查看记录、确认处理</span><b>打开家属端 →</b></Link>
        </div>
      </section>

      <footer className="site-footer">
        <strong>TwinGuard</strong>
        <span>居家跌倒风险守护</span>
      </footer>
    </main>
  );
}
