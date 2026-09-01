import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TwinGuard｜居家跌倒风险守护',
  description: '面向老人、家属与守护人员的居家跌倒风险守护产品体验。',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
