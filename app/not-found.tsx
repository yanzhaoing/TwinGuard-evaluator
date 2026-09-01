import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="not-found">
      <p>404</p>
      <h1>这个页面不存在</h1>
      <Link className="button primary" href="/">返回首页</Link>
    </main>
  );
}
