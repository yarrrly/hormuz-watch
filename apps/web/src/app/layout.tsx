import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hormuz Watch — Strait of Hormuz Crisis Tracker",
  description: "Real-time dashboard tracking the 2026 Strait of Hormuz blockade. Live vessel tracking, oil prices, and personal fuel impact calculator. See how the crisis affects YOUR fuel prices.",
  keywords: "Hormuz, Strait of Hormuz, oil crisis, blockade, tanker, Brent crude, fuel prices, AIS, vessel tracking",
  openGraph: {
    title: "🔴 Hormuz Watch — The Strait is Blocked",
    description: "20M barrels/day blocked. See how it affects YOUR fuel prices.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "🔴 Hormuz Watch — The Strait is Blocked",
    description: "20M barrels/day blocked. See how it affects YOUR fuel prices.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#0a0e17" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🔴</text></svg>" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossOrigin="" />
      </head>
      <body>{children}</body>
    </html>
  );
}
