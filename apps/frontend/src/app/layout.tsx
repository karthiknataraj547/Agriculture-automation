import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { SpeedInsights } from '@vercel/speed-insights/next';
import '../styles/globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'AetherCrop — Spatial IoT Agriculture Platform',
  description:
    'Enterprise-grade Smart Agriculture Irrigation Management Platform with real-time IoT monitoring, AI analytics, and spatial 3D visualization.',
  keywords: [
    'agriculture',
    'IoT',
    'irrigation',
    'smart farming',
    'spatial',
    'telemetry',
    'MQTT',
  ],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#05070a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} antialiased`}>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
