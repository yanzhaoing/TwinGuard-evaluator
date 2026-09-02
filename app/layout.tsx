import type { Metadata } from 'next';
import './globals.css';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export const metadata: Metadata = {
  title: 'TwinGuard｜居家跌倒风险守护',
  description: '面向老人、家属与守护人员的居家跌倒风险守护产品体验。',
  icons: { icon: { url: `${basePath}/favicon.svg`, type: 'image/svg+xml' } },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
