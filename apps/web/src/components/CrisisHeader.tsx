'use client';

import { useEffect, useState } from 'react';

const CRISIS_START = new Date('2026-02-28T06:00:00Z').getTime();

interface CrisisHeaderProps {
    lastDataUpdate: number; // timestamp of last successful API response
}

export default function CrisisHeader({ lastDataUpdate }: CrisisHeaderProps) {
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    const daysSinceCrisis = Math.floor((now - CRISIS_START) / 86_400_000);
    const staleness = Math.floor((now - lastDataUpdate) / 1000);

    // Green < 60s, amber < 300s, red >= 300s
    const freshnessClass =
        staleness < 60 ? 'crisis-header__dot--live' :
            staleness < 300 ? 'crisis-header__dot--stale' :
                'crisis-header__dot--offline';

    const freshnessLabel =
        staleness < 60 ? 'LIVE' :
            staleness < 300 ? 'STALE' :
                'OFFLINE';

    return (
        <header className="crisis-header">
            <div className="crisis-header__left">
                <span className="crisis-header__brand">HORMUZ WATCH</span>
            </div>
            <div className="crisis-header__center">
                <span className="crisis-header__blocked">STRAIT OF HORMUZ BLOCKED</span>
                <span className="crisis-header__sep">│</span>
                <span className="crisis-header__day">DAY {daysSinceCrisis}</span>
                <span className="crisis-header__sep">│</span>
                <span className={`crisis-header__dot ${freshnessClass}`} />
                <span className="crisis-header__live-label">{freshnessLabel}</span>
                <span className="crisis-header__sep">│</span>
                <span className="crisis-header__freshness">
                    Updated {staleness < 60 ? `${staleness}s` : staleness < 3600 ? `${Math.floor(staleness / 60)}m` : `${Math.floor(staleness / 3600)}h`} ago
                </span>
            </div>
        </header>
    );
}
