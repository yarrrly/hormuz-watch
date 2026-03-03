'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import CrisisHeader from '@/components/CrisisHeader';
import HeroCounter from '@/components/HeroCounter';
import SecondaryCounters from '@/components/SecondaryCounters';
import PersonalTeaser from '@/components/PersonalTeaser';
import Calculator from '@/components/Calculator';
import PredictionGame from '@/components/PredictionGame';
import NewsTicker from '@/components/NewsTicker';
import Map from '@/components/Map';
import Methodology from '@/components/Methodology';

// Worker endpoints (override with env vars for production)
const OIL_PRICE_API = process.env.NEXT_PUBLIC_OIL_PRICE_API || '';
const AIS_PROXY_API = process.env.NEXT_PUBLIC_AIS_PROXY_API || '';

export default function Dashboard() {
  const [oilPrice, setOilPrice] = useState<number | null>(null);
  const [tankerCount, setTankerCount] = useState(30);
  const [lastDataUpdate, setLastDataUpdate] = useState(Date.now());
  const calculatorRef = useRef<HTMLDivElement>(null);

  // Fetch oil price from worker
  useEffect(() => {
    const fetchPrice = async () => {
      if (!OIL_PRICE_API) {
        setOilPrice(82.15);
        setLastDataUpdate(Date.now());
        return;
      }
      try {
        const res = await fetch(`${OIL_PRICE_API}/price`);
        if (res.ok) {
          const data = await res.json();
          setOilPrice(data.price);
          setLastDataUpdate(Date.now());
        }
      } catch {
        setOilPrice(82.15);
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, 60_000);
    return () => clearInterval(interval);
  }, []);

  const handleVesselCount = useCallback((count: number) => {
    setTankerCount(count);
  }, []);

  const scrollToCalculator = useCallback(() => {
    calculatorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <div className="dashboard">
      {/* Crisis status strip */}
      <CrisisHeader lastDataUpdate={lastDataUpdate} />

      {/* Hero: ONE dominant number */}
      <HeroCounter oilPrice={oilPrice} />

      {/* Secondary counters */}
      <SecondaryCounters oilPrice={oilPrice} tankerCount={tankerCount} />

      {/* Personalized teaser — auto-detected country */}
      <PersonalTeaser oilPrice={oilPrice} onScrollToCalculator={scrollToCalculator} />

      {/* News ticker */}
      <NewsTicker />

      {/* Main content: Map + Sidebar */}
      <div className="main-grid">
        <Map apiUrl={AIS_PROXY_API || undefined} onVesselCount={handleVesselCount} />
        <div className="sidebar" ref={calculatorRef}>
          <Calculator oilPrice={oilPrice} />
          <PredictionGame />
        </div>
      </div>

      {/* Methodology / Trust Layer */}
      <Methodology />

      {/* Footer */}
      <footer className="footer">
        <div>
          HORMUZ WATCH — Tracking the 2026 Strait of Hormuz Crisis<br />
          Vessel data: <a href="https://aisstream.io" target="_blank" rel="noopener">aisstream.io</a> | Oil prices: <a href="https://twelvedata.com" target="_blank" rel="noopener">Twelve Data</a><br />
          Vessel positions delayed 15 min for crew safety. Not financial advice.<br />
          Data for educational purposes only.
        </div>
      </footer>
    </div>
  );
}
