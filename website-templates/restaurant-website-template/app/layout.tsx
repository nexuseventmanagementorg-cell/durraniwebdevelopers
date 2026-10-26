import type { Metadata, Viewport } from 'next';
import './globals.css';
import SiteShell from '@/components/SiteShell';

export const metadata: Metadata = {
  title: 'Restaurant Website Template',
  applicationName: 'Restaurant Website Template',
  description:
    'A customizable restaurant website template with online ordering, menu management, and QR table ordering.',
  authors: [{ name: 'Restaurant Website Template' }],
  creator: 'Durrani Web Developers',
  publisher: 'Restaurant Website Template',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'Restaurant Website Template',
    description:
      'A customizable restaurant website template with online ordering, menu management, and QR table ordering.',
    url: '/',
    siteName: 'Restaurant Website Template',
    images: [
      {
        url: '/images/hero/hero-shawarma.webp',
        width: 1200,
        height: 630,
        alt: 'Restaurant menu preview',
      },
    ],
    locale: 'en_PK',
    type: 'website',
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#f59e0b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col bg-[#0c0a09] text-zinc-100 antialiased selection:bg-amber-500 selection:text-zinc-950">
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
