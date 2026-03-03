'use client';

import { useState, useMemo } from 'react';
import {
    computeX,
    chooseFraming,
    formatShareCard,
    FHWA_AVG_GALLONS,
    EIA_BASELINE_PRICE,
} from '@hormuz-watch/shared';
import type { ShareFramingInputs, Framing } from '@hormuz-watch/shared';

const BRENT_BASELINE = 73;

interface CountryData {
    name: string;
    flag: string;
    unit: string;
    pt: number;
    currency: string;
    currentPrice: number;
}

const COUNTRIES: Record<string, CountryData> = {
    US: { name: "United States", flag: "🇺🇸", unit: "$/gal", pt: 0.025, currency: "USD", currentPrice: 3.45 },
    UK: { name: "United Kingdom", flag: "🇬🇧", unit: "£/L", pt: 0.008, currency: "GBP", currentPrice: 1.45 },
    DE: { name: "Germany", flag: "🇩🇪", unit: "€/L", pt: 0.009, currency: "EUR", currentPrice: 1.75 },
    FR: { name: "France", flag: "🇫🇷", unit: "€/L", pt: 0.009, currency: "EUR", currentPrice: 1.80 },
    JP: { name: "Japan", flag: "🇯🇵", unit: "¥/L", pt: 1.2, currency: "JPY", currentPrice: 175 },
    IN: { name: "India", flag: "🇮🇳", unit: "₹/L", pt: 0.7, currency: "INR", currentPrice: 105 },
    BR: { name: "Brazil", flag: "🇧🇷", unit: "R$/L", pt: 0.04, currency: "BRL", currentPrice: 5.80 },
    AU: { name: "Australia", flag: "🇦🇺", unit: "A$/L", pt: 0.012, currency: "AUD", currentPrice: 1.95 },
    CA: { name: "Canada", flag: "🇨🇦", unit: "C$/L", pt: 0.011, currency: "CAD", currentPrice: 1.65 },
    NL: { name: "Netherlands", flag: "🇳🇱", unit: "€/L", pt: 0.009, currency: "EUR", currentPrice: 2.05 },
    KR: { name: "South Korea", flag: "🇰🇷", unit: "₩/L", pt: 10.5, currency: "KRW", currentPrice: 1750 },
    SA: { name: "Saudi Arabia", flag: "🇸🇦", unit: "SAR/L", pt: 0.001, currency: "SAR", currentPrice: 2.18 },
    TR: { name: "Turkey", flag: "🇹🇷", unit: "₺/L", pt: 0.25, currency: "TRY", currentPrice: 42.50 },
    ZA: { name: "South Africa", flag: "🇿🇦", unit: "R/L", pt: 0.15, currency: "ZAR", currentPrice: 24.50 },
    NG: { name: "Nigeria", flag: "🇳🇬", unit: "₦/L", pt: 5.0, currency: "NGN", currentPrice: 620 },
};

interface CalculatorProps {
    oilPrice: number | null;
}

export default function Calculator({ oilPrice }: CalculatorProps) {
    const [selectedCountry, setSelectedCountry] = useState('US');
    const [copied, setCopied] = useState(false);
    const [showPersonalize, setShowPersonalize] = useState(false);
    const [milesPerYear, setMilesPerYear] = useState<string>('');
    const [mpg, setMpg] = useState<string>('');
    const price = oilPrice ?? 82.15;

    const isUS = selectedCountry === 'US';

    // Compute per-unit impact (all countries)
    const impact = useMemo(() => {
        const country = COUNTRIES[selectedCountry];
        if (!country) return null;
        const priceDelta = price - BRENT_BASELINE;
        const projectedIncrease = Math.max(0, priceDelta * country.pt);
        return {
            ...country,
            projectedIncrease,
            projectedPrice: country.currentPrice + projectedIncrease,
        };
    }, [selectedCountry, price]);

    // Compute temporal framing (US only)
    const temporalFraming = useMemo(() => {
        if (!isUS || !impact) return null;

        const inp: ShareFramingInputs = {
            deltaP: impact.projectedIncrease,
            P0: EIA_BASELINE_PRICE,
            milesPerYear: milesPerYear ? parseFloat(milesPerYear) : undefined,
            mpg: mpg ? parseFloat(mpg) : undefined,
        };

        const x = computeX(inp);
        const framing = chooseFraming(inp);

        return { x, framing, inp };
    }, [isUS, impact, milesPerYear, mpg]);

    const handleShare = async () => {
        if (!impact) return;

        let text: string;

        if (isUS && temporalFraming) {
            text = formatShareCard(temporalFraming.inp, temporalFraming.framing);
        } else {
            const percentIncrease = ((impact.projectedIncrease / impact.currentPrice) * 100).toFixed(1);
            text = `🔴 Strait of Hormuz BLOCKED\n\n${impact.flag} ${impact.name} fuel projected to rise +${impact.projectedIncrease.toFixed(impact.projectedIncrease < 1 ? 3 : 2)} ${impact.unit}\nThat's a ${percentIncrease}% increase from the crisis.\n\nCheck your country: hormuz.watch\n#HormuzWatch #OilCrisis`;
        }

        if (navigator.share) {
            try {
                await navigator.share({ text });
                return;
            } catch { /* fallback */ }
        }

        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback
        }
    };

    if (!impact) return null;

    return (
        <div className="calculator">
            <div className="calculator__title">💰 Personal Impact Calculator</div>

            <div className="calculator__select-wrapper">
                <select
                    className="calculator__select"
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                >
                    {Object.entries(COUNTRIES).map(([code, c]) => (
                        <option key={code} value={code}>
                            {c.flag} {c.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* ── Temporal Framing Hero (US only) ── */}
            {isUS && temporalFraming && temporalFraming.x.perYear > 0 && (
                <div className="calculator__framing-hero">
                    <div className="calculator__framing-hero-value">
                        +${Math.round(temporalFraming.x.perYear)}<span className="calculator__framing-hero-unit">/year</span>
                    </div>
                    <div className="calculator__framing-hero-sub">
                        ≈ ${Math.round(temporalFraming.x.perMonth)}/month
                    </div>
                    <div className="calculator__framing-secondary">
                        ≈ +${temporalFraming.x.abs.toFixed(2)}/gal
                    </div>
                    <div className="calculator__framing-note">
                        Based on {milesPerYear || '11,106'} mi/yr
                        {mpg ? ` · ${mpg} mpg` : ` · ${22.6} mpg avg`}
                    </div>
                </div>
            )}

            <div className="calculator__result">
                <div className="calculator__current">
                    <span>Current price</span>
                    <span>{impact.currentPrice.toFixed(impact.currentPrice < 10 ? 2 : 0)} {impact.unit}</span>
                </div>
                <div className="calculator__projected">
                    <span className="calculator__projected-label">Projected</span>
                    <span className="calculator__projected-value">
                        {impact.projectedPrice.toFixed(impact.projectedPrice < 10 ? 2 : 0)} {impact.unit}
                    </span>
                </div>
            </div>

            <div className="calculator__increase">
                <div className="calculator__increase-value">
                    +{impact.projectedIncrease.toFixed(impact.projectedIncrease < 1 ? 3 : 2)} {impact.unit}
                </div>
                <div className="calculator__increase-label">
                    projected increase ({((impact.projectedIncrease / impact.currentPrice) * 100).toFixed(1)}%)
                </div>
            </div>

            {/* ── Personalize (US only) ── */}
            {isUS && (
                <div className="calculator__personalize">
                    <button
                        className="calculator__personalize-toggle"
                        onClick={() => setShowPersonalize(!showPersonalize)}
                    >
                        {showPersonalize ? '▾' : '▸'} Personalize estimate
                    </button>
                    {showPersonalize && (
                        <div className="calculator__personalize-fields">
                            <div className="calculator__personalize-field">
                                <label>Miles / year</label>
                                <input
                                    type="number"
                                    placeholder="11,106"
                                    value={milesPerYear}
                                    onChange={(e) => setMilesPerYear(e.target.value)}
                                />
                            </div>
                            <div className="calculator__personalize-field">
                                <label>MPG</label>
                                <input
                                    type="number"
                                    placeholder="22.6"
                                    value={mpg}
                                    onChange={(e) => setMpg(e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            <button className="calculator__share" onClick={handleShare}>
                {copied ? '✓ Copied to clipboard!' : '📤 Share your impact'}
            </button>
        </div>
    );
}
