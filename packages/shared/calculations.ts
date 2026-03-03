import { BRENT_BASELINE, COUNTRIES } from './countries';
import type { FuelImpact } from './types';

/**
 * ~20M barrels/day blocked → ~231.48 barrels per second
 */
export const BARRELS_PER_SECOND = 20_000_000 / 86_400;

/**
 * Crisis start: Feb 28, 2026, 06:00 UTC (first strikes reported)
 */
export const CRISIS_START = new Date('2026-02-28T06:00:00Z').getTime();

/**
 * Calculate total blocked barrels since crisis start
 */
export function getBlockedBarrels(nowMs: number = Date.now()): number {
    const elapsedSec = Math.max(0, (nowMs - CRISIS_START) / 1000);
    return elapsedSec * BARRELS_PER_SECOND;
}

/**
 * Calculate USD value of blocked oil
 */
export function getBlockedValue(brentPrice: number, nowMs: number = Date.now()): number {
    return getBlockedBarrels(nowMs) * brentPrice;
}

/**
 * Calculate projected fuel price increase for a country
 */
export function getFuelImpact(countryCode: string, brentPrice: number): FuelImpact | null {
    const country = COUNTRIES[countryCode];
    if (!country) return null;

    const priceDelta = brentPrice - BRENT_BASELINE;
    const projectedIncrease = priceDelta * country.pt;

    return {
        country: country.name,
        currentPrice: country.currentPrice,
        projectedIncrease: Math.max(0, projectedIncrease),
        projectedPrice: country.currentPrice + Math.max(0, projectedIncrease),
        unit: country.unit,
        flag: country.flag,
    };
}

/**
 * Format large numbers with commas
 */
export function formatNumber(n: number, decimals = 0): string {
    return n.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}

/**
 * Format currency compactly ($1.2B, $845M, etc.)
 */
export function formatCompactUsd(value: number): string {
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
}
