import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '369com.co — The 369 Resonance Lab & Manifestation Engine',
  description:
    'Experience Nikola Tesla’s sacred 3-6-9 vortex mathematics, Web Audio Solfeggio frequency generator (369Hz, 528Hz, 963Hz), and algorithmic Pythagorean numerology.',
  keywords: [
    '369 manifestation',
    'Nikola Tesla 369',
    'Solfeggio frequencies',
    '369Hz',
    '528Hz',
    'numerology calculator',
    'Life Path Number',
    'vortex mathematics'
  ],
  authors: [{ name: '369 Resonance Lab' }],
  metadataBase: new URL('https://369com.co'),
  openGraph: {
    title: '369com.co — Sacred Resonance & Manifestation Engine',
    description:
      'Harmonize your vibration with the 3-6-9 frequency matrix, interactive daily scripting chamber, and personalized Tesla blueprint.',
    url: 'https://369com.co',
    siteName: '369com.co',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: '369com.co — The 369 Manifestation Engine',
    description: 'Experience Nikola Tesla’s sacred 3-6-9 vortex frequencies & numerology.',
  },
};

export const viewport: Viewport = {
  themeColor: '#090a10',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className="min-h-screen bg-[#090a10] text-zinc-100 antialiased selection:bg-amber-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}
