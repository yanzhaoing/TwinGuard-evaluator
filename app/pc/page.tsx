import Link from 'next/link';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const assetPath = (path: string) => `${basePath}${path}`;

const samples = [
  ['视频抽样', '42个时点'],
  ['有人', '38个'],
  ['无人', '4个'],
  ['原系统误确认', '1次'],
];

const processingSteps = [
  ['01', '萤石视频', '31:03 连续接入'],
  ['02', '人在画面中', '38 / 42 抽查时点'],
  ['03', '视觉风险分', '5,957条有效输出'],
  ['04', '光照与心率', '372条 · 1,838条'],
  ['05', '分层升级', '提示 → 疑似 → 确认 → 响应'],
];

export default function PcPage() {
  return (
    <main className="product-page pc-page">
      <a className="skip-link" href="#pc-main">跳到主要内容</a>
      <header className="product-header">
        <Link className="brand" href="/" aria-label="返回 TwinGuard 首页">
          <span className="brand-mark" aria-hidden="true">T</span>
          <span>TwinGuard</span>
        </Link>
        <div>
          <strong>电脑管理台</strong>
          <span>2026年8月27日居家实测</span>
        </div>
        <Link className="back-link" href="/">返回首页</Link>
      </header>

      <div id="pc-main" className="pc-layout">
        <section className="pc-summary" aria-labelledby="pc-title">
          <div>
            <p className="section-date">场次 competition-20260827-214444</p>
            <h1 id="pc-title">31分03秒连续运行记录</h1>
          </div>
          <span className="plain-status success">采集已完成</span>
        </section>

        <section className="pc-flow" aria-labelledby="pc-flow-title">
          <div className="pc-flow-head">
            <div>
              <p>运行链路</p>
              <h2 id="pc-flow-title">从画面接入到事件处置</h2>
            </div>
            <span>同一场次 · 同一时间轴</span>
          </div>
          <ol>
            {processingSteps.map(([number, title, detail]) => (
              <li key={number}>
                <span>{number}</span>
                <strong>{title}</strong>
                <small>{detail}</small>
              </li>
            ))}
          </ol>
          <p>风险分由视觉模型给出。低照时延长确认；心率随事件保存，不参与评分或告警触发。</p>
        </section>

        <section className="pc-screen" aria-label="实测画面和判断结果">
          <div className="screen-frame">
            {/* vinext 当前与 next/image 的客户端钩子不兼容，因此保留明确尺寸的原生图片。 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={assetPath('/evidence/real_session_contact_sheet.jpg')} width="1600" height="1200" alt="居家实测的脱敏抽样画面" />
            <span className="screen-label">脱敏抽样画面</span>
          </div>
          <div className="screen-facts">
            <div className="fact-head">
              <div>
                <span>本次采集</span>
                <strong>日常活动，未见跌倒</strong>
              </div>
              <span className="plain-status success">记录已保存</span>
            </div>
            <dl className="sample-list">
              {samples.map(([term, value]) => (
                <div key={term}><dt>{term}</dt><dd>{value}</dd></div>
              ))}
            </dl>
          </div>
        </section>

        <section className="pc-cards" aria-label="系统判断与处置状态">
          <article>
            <p>风险判断</p>
            <h2>视觉模型给出风险分</h2>
            <ul className="plain-list">
              <li><b>视觉</b><span>5,957条有效风险分</span></li>
              <li><b>光照</b><span>372条记录，用于低照确认</span></li>
              <li><b>心率</b><span>1,838条记录，随事件保存</span></li>
            </ul>
          </article>
          <article>
            <p>人工复核</p>
            <h2>问题已定位并复核</h2>
            <div className="large-copy">原系统在14:15:38把弯腰或快速坐下完整误确认1次。当前v9.7对留存的5秒片段重放，风险提示、疑似事件、完整确认和应急响应均未触发。因未留存完整31分钟视频，不宣称当前系统全场零误报。</div>
          </article>
          <article>
            <p>通知链路</p>
            <h2>微信已收到</h2>
            <div className="large-copy">微信通知已送达（独立联调）。31分钟实测未发生跌倒，因此没有触发真实告警。</div>
            <Link className="text-link" href="/#evidence">查看脱敏截图 →</Link>
          </article>
        </section>
      </div>
    </main>
  );
}
