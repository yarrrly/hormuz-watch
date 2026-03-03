'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

const BRENT_BASELINE = 73;
const BARRELS_PER_SECOND = 20_000_000 / 86_400;
const CRISIS_START = new Date('2026-02-28T06:00:00Z').getTime();

interface CounterProps {
    oilPrice: number | null;
    tankerCount: number;
}

export default function Counters({ oilPrice, tankerCount }: CounterProps) {
    const [barrels, setBarrels] = useState(0);
    const [value, setValue] = useState(0);
    const rafRef = useRef<number>(0);
    const price = oilPrice ?? 82.15;

    const formatNumber = useCallback((n: number, decimals = 0): string => {
        return n.toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        });
    }, []);

    const formatCompactUsd = useCallback((val: number): string => {
        if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(2)}B`;
        if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
        if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
        return `$${val.toFixed(0)}`;
    }, []);

    useEffect(() => {
        const tick = () => {
            const now = Date.now();
            const elapsedSec = Math.max(0, (now - CRISIS_START) / 1000);
            const currentBarrels = elapsedSec * BARRELS_PER_SECOND;
            setBarrels(currentBarrels);
            setValue(currentBarrels * price);
            rafRef.current = requestAnimationFrame(tick);
        };

        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [price]);

    const brentChange = oilPrice
        ? ((oilPrice - BRENT_BASELINE) / BRENT_BASELINE * 100)
        : 12.5;

    return (
        <div className="counters">
            <div className="counter-card counter-card--red">
                <div className="counter-card__label">Blocked Oil</div>
                <div className="counter-card__value">{formatNumber(barrels)} bbl</div>
                <div className="counter-card__sub">~20M bbl/day blocked</div>
            </div>

            <div className="counter-card counter-card--amber">
                <div className="counter-card__label">Blocked Value</div>
                <div className="counter-card__value">{formatCompactUsd(value)}</div>
                <div className="counter-card__sub">at ${price.toFixed(2)}/bbl</div>
            </div>

            <div className="counter-card counter-card--cyan">
                <div className="counter-card__label">Brent Crude</div>
                <div className="counter-card__value">${price.toFixed(2)}</div>
                <div className="counter-card__sub" style={{ color: brentChange > 0 ? 'var(--red)' : 'var(--green)' }}>
                    {brentChange > 0 ? '▲' : '▼'} {Math.abs(brentChange).toFixed(1)}% from pre-crisis
                </div>
            </div>

            <div className="counter-card counter-card--green">
                <div className="counter-card__label">Tankers Tracked</div>
                <div className="counter-card__value">{tankerCount}</div>
                <div className="counter-card__sub">via AIS in Hormuz region</div>
            </div>
        </div>
    );
}
