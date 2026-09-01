import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TwinGuard｜居家跌倒风险守护',
  description: '基于萤石视频流的居家跌倒风险分析，以及一次31分钟真实居家实测记录。',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
