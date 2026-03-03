'use client';

import { useState, useEffect, useCallback } from 'react';
import Counters from '@/components/Counters';
import Calculator from '@/components/Calculator';
import NewsTicker from '@/components/NewsTicker';
import Map from '@/components/Map';

// Worker endpoints (override with env vars for production)
const OIL_PRICE_API = process.env.NEXT_PUBLIC_OIL_PRICE_API || '';
const AIS_PROXY_API = process.env.NEXT_PUBLIC_AIS_PROXY_API || '';

export default function Dashboard() {
  const [oilPrice, setOilPrice] = useState<number | null>(null);
  const [tankerCount, setTankerCount] = useState(30); // default from mock data
  const [currentTime, setCurrentTime] = useState('');

  // Fetch oil price from worker
  useEffect(() => {
    const fetchPrice = async () => {
      if (!OIL_PRICE_API) {
        // Mock value for dev
        setOilPrice(82.15);
        return;
      }
      try {
        const res = await fetch(`${OIL_PRICE_API}/price`);
        if (res.ok) {
          const data = await res.json();
          setOilPrice(data.price);
        }
      } catch {
        setOilPrice(82.15); // fallback
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, 60_000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  // Live clock
  useEffect(() => {
    const tick = () => {
      setCurrentTime(
        new Date().toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZoneName: 'short',
        })
      );
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleVesselCount = useCallback((count: number) => {
    setTankerCount(count);
  }, []);

  // Days since crisis
  const crisisStart = new Date('2026-02-28T06:00:00Z');
  const daysSinceCrisis = Math.floor((Date.now() - crisisStart.getTime()) / 86_400_000);

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="header">
        <div className="header__logo">
          <span className="header__dot" />
          <div>
            <h1 className="header__title">Hormuz Watch</h1>
            <div className="header__subtitle">Real-Time Crisis Dashboard</div>
          </div>
        </div>
        <div className="header__status">
          <span>STRAIT BLOCKED</span>
          <span style={{ color: 'var(--text-muted)' }}>|</span>
          <span style={{ color: 'var(--amber)' }}>DAY {daysSinceCrisis}</span>
          <span style={{ color: 'var(--text-muted)' }}>|</span>
          <span style={{ color: 'var(--text-muted)' }}>{currentTime}</span>
        </div>
      </header>

      {/* News ticker */}
      <NewsTicker />

      {/* Ticking counters */}
      <Counters oilPrice={oilPrice} tankerCount={tankerCount} />

      {/* Main content: Map + Sidebar */}
      <div className="main-grid">
        <Map apiUrl={AIS_PROXY_API || undefined} onVesselCount={handleVesselCount} />
        <div className="sidebar">
          <Calculator oilPrice={oilPrice} />
        </div>
      </div>

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
