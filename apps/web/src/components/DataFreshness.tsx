'use client';

import { useEffect, useState } from 'react';

interface DataFreshnessProps {
    lastUpdate: number;
}

export default function DataFreshness({ lastUpdate }: DataFreshnessProps) {
    const [seconds, setSeconds] = useState(0);

    useEffect(() => {
        const tick = () => {
            setSeconds(Math.floor((Date.now() - lastUpdate) / 1000));
        };
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [lastUpdate]);

    const className =
        seconds < 60 ? 'data-freshness data-freshness--live' :
            seconds < 300 ? 'data-freshness data-freshness--stale' :
                'data-freshness data-freshness--offline';

    const label =
        seconds < 60 ? `${seconds}s ago` :
            seconds < 3600 ? `${Math.floor(seconds / 60)}m ago` :
                `${Math.floor(seconds / 3600)}h ago`;

    return (
        <span className={className}>
            Updated {label}
        </span>
    );
}
