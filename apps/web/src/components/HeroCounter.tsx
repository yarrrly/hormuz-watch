'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

const CRISIS_START = new Date('2026-02-28T06:00:00Z').getTime();
const BASELINE_FLOW = 20_900_000; // bbl/day pre-crisis
const BLOCKED_FRACTION = 0.70; // 70% reduction
const BLOCKED_RATE_PER_SEC = (BASELINE_FLOW * BLOCKED_FRACTION) / 86_400;

function getInitialValues(brentPrice: number) {
    const elapsedMs = Date.now() - CRISIS_START;
    const elapsedSec = Math.max(0, elapsedMs / 1000);
    const blockedBarrels = BLOCKED_RATE_PER_SEC * elapsedSec;
    const blockedValue = blockedBarrels * brentPrice;
    const valuePerSec = BLOCKED_RATE_PER_SEC * brentPrice;
    return { blockedBarrels, blockedValue, valuePerSec };
}

interface HeroCounterProps {
    oilPrice: number | null;
}

export default function HeroCounter({ oilPrice }: HeroCounterProps) {
    const price = oilPrice ?? 82.15;
    const [value, setValue] = useState(() => getInitialValues(price).blockedValue);
    const [ratePerSec, setRatePerSec] = useState(() => getInitialValues(price).valuePerSec);
    const rafRef = useRef<number>(0);

    useEffect(() => {
        const tick = () => {
            const { blockedValue, valuePerSec } = getInitialValues(price);
            setValue(blockedValue);
            setRatePerSec(valuePerSec);
            rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [price]);

    const formatHeroValue = useCallback((val: number): string => {
        if (val >= 1_000_000_000_000) return `$${(val / 1_000_000_000_000).toFixed(2)}T`;
        if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(3)}B`;
        if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
        return `$${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    }, []);

    const formatRate = useCallback((rate: number): string => {
        if (rate >= 1_000_000) return `$${(rate / 1_000_000).toFixed(1)}M`;
        if (rate >= 1_000) return `$${(rate / 1_000).toFixed(0)}K`;
        return `$${rate.toFixed(0)}`;
    }, []);

    return (
        <div className="hero-counter">
            <div className="hero-counter__label">Blocked Oil Value (USD)</div>
            <div className="hero-counter__value">{formatHeroValue(value)}</div>
            <div className="hero-counter__rate">
                ▲ {formatRate(ratePerSec)}/sec
            </div>
        </div>
    );
}
