'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

const CRISIS_START = new Date('2026-02-28T06:00:00Z').getTime();
const BASELINE_FLOW = 20_900_000;
const BLOCKED_FRACTION = 0.70;
const BLOCKED_RATE_PER_SEC = (BASELINE_FLOW * BLOCKED_FRACTION) / 86_400;
const BRENT_BASELINE = 73;

interface SecondaryCountersProps {
    oilPrice: number | null;
    tankerCount: number;
}

export default function SecondaryCounters({ oilPrice, tankerCount }: SecondaryCountersProps) {
    const price = oilPrice ?? 82.15;
    const [barrels, setBarrels] = useState(() => {
        const elapsedSec = Math.max(0, (Date.now() - CRISIS_START) / 1000);
        return BLOCKED_RATE_PER_SEC * elapsedSec;
    });
    const rafRef = useRef<number>(0);

    useEffect(() => {
        const tick = () => {
            const elapsedSec = Math.max(0, (Date.now() - CRISIS_START) / 1000);
            setBarrels(BLOCKED_RATE_PER_SEC * elapsedSec);
            rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, []);

    const formatBarrels = useCallback((n: number): string => {
        if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
        if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
        return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
    }, []);

    const brentChange = ((price - BRENT_BASELINE) / BRENT_BASELINE * 100);

    return (
        <div className="secondary-counters">
            <div className="secondary-counter secondary-counter--red">
                <div className="secondary-counter__value">{formatBarrels(barrels)}</div>
                <div className="secondary-counter__label">barrels blocked</div>
            </div>
            <div className="secondary-counter secondary-counter--cyan">
                <div className="secondary-counter__value">${price.toFixed(2)}</div>
                <div className="secondary-counter__label">Brent/bbl</div>
                <div className="secondary-counter__sub" style={{ color: brentChange > 0 ? 'var(--red)' : 'var(--green)' }}>
                    {brentChange > 0 ? '▲' : '▼'} {Math.abs(brentChange).toFixed(1)}%
                </div>
            </div>
            <div className="secondary-counter secondary-counter--green">
                <div className="secondary-counter__value">{tankerCount}</div>
                <div className="secondary-counter__label">tankers tracked</div>
            </div>
        </div>
    );
}
