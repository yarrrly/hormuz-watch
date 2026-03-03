import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hormuz Watch — Live Strait Blockade Tracker",
  description: "Real-time tracking of the 2026 Strait of Hormuz oil blockade. See how it affects YOUR fuel prices.",
  keywords: "Hormuz, Strait of Hormuz, oil crisis, blockade, tanker, Brent crude, fuel prices, AIS, vessel tracking",
  openGraph: {
    title: "Hormuz Watch — How Much More Will YOU Pay?",
    description: "The Hormuz blockade is costing the world $2.1M every second. Check your country's fuel impact.",
    url: "https://hormuz.watch",
    images: [{
      url: "https://og.hormuz.watch/?country=US&brent=82.15&impact=180&flag=🌍&unit=avg",
      width: 1200,
      height: 630,
      alt: "Hormuz Watch Crisis Dashboard",
    }],
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hormuz Watch — Live Strait Blockade Tracker",
    description: "Real-time tracking of the 2026 Strait of Hormuz oil blockade. See how it affects YOUR fuel prices.",
    images: ["https://og.hormuz.watch/?country=US&brent=82.15&impact=180&flag=🌍&unit=avg"],
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
