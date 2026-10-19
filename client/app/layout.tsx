import type { Metadata } from 'next';
import 'geist/font/sans';
import './globals.css';

export const metadata: Metadata = {
  title: 'LifeLine | Find help when every minute matters',
  description:
    'Connect with nearby volunteers and emergency service providers. In a life-threatening emergency, call 112 or 108.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
