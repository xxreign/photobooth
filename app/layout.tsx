import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'HI THERE', description: 'Four little moments. One keepsake.',
  applicationName: 'HI THERE',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'HI THERE' },
  icons: { icon: '/icon-192.png', apple: '/apple-touch-icon.png' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#15171a' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
