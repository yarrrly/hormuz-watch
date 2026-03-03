'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
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
    litersPerYear: number;
    label: string;
}

const COUNTRIES: Record<string, CountryData> = {
    US: { name: "United States", flag: "🇺🇸", unit: "$/gal", pt: 0.025, currency: "USD", currentPrice: 3.45, litersPerYear: 4542, label: "avg US household (1,200 gal/yr)" },
    UK: { name: "United Kingdom", flag: "🇬🇧", unit: "£/L", pt: 0.008, currency: "GBP", currentPrice: 1.45, litersPerYear: 1800, label: "avg UK household" },
    DE: { name: "Germany", flag: "🇩🇪", unit: "€/L", pt: 0.009, currency: "EUR", currentPrice: 1.75, litersPerYear: 1500, label: "avg German household" },
    FR: { name: "France", flag: "🇫🇷", unit: "€/L", pt: 0.009, currency: "EUR", currentPrice: 1.80, litersPerYear: 1400, label: "avg French household" },
    JP: { name: "Japan", flag: "🇯🇵", unit: "¥/L", pt: 1.2, currency: "JPY", currentPrice: 175, litersPerYear: 1200, label: "avg Japanese household" },
    IN: { name: "India", flag: "🇮🇳", unit: "₹/L", pt: 0.7, currency: "INR", currentPrice: 105, litersPerYear: 600, label: "avg Indian household" },
    BR: { name: "Brazil", flag: "🇧🇷", unit: "R$/L", pt: 0.04, currency: "BRL", currentPrice: 5.80, litersPerYear: 1100, label: "avg Brazilian household" },
    AU: { name: "Australia", flag: "🇦🇺", unit: "A$/L", pt: 0.012, currency: "AUD", currentPrice: 1.95, litersPerYear: 1600, label: "avg Australian household" },
    CA: { name: "Canada", flag: "🇨🇦", unit: "C$/L", pt: 0.011, currency: "CAD", currentPrice: 1.65, litersPerYear: 1700, label: "avg Canadian household" },
    NL: { name: "Netherlands", flag: "🇳🇱", unit: "€/L", pt: 0.009, currency: "EUR", currentPrice: 2.05, litersPerYear: 1400, label: "avg Dutch household" },
    KR: { name: "South Korea", flag: "🇰🇷", unit: "₩/L", pt: 10.5, currency: "KRW", currentPrice: 1750, litersPerYear: 1300, label: "avg Korean household" },
    SA: { name: "Saudi Arabia", flag: "🇸🇦", unit: "SAR/L", pt: 0.001, currency: "SAR", currentPrice: 2.18, litersPerYear: 2200, label: "avg Saudi household" },
    TR: { name: "Turkey", flag: "🇹🇷", unit: "₺/L", pt: 0.25, currency: "TRY", currentPrice: 42.50, litersPerYear: 800, label: "avg Turkish household" },
    ZA: { name: "South Africa", flag: "🇿🇦", unit: "R/L", pt: 0.15, currency: "ZAR", currentPrice: 24.50, litersPerYear: 900, label: "avg South African household" },
    NG: { name: "Nigeria", flag: "🇳🇬", unit: "₦/L", pt: 5.0, currency: "NGN", currentPrice: 620, litersPerYear: 400, label: "avg Nigerian household" },
};

// Timezone → country code mapping
const TIMEZONE_TO_COUNTRY: Record<string, string> = {
    'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US', 'America/Los_Angeles': 'US',
    'America/Phoenix': 'US', 'America/Anchorage': 'US', 'Pacific/Honolulu': 'US',
    'Europe/London': 'UK', 'Europe/Berlin': 'DE', 'Europe/Paris': 'FR',
    'Asia/Tokyo': 'JP', 'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN',
    'America/Sao_Paulo': 'BR', 'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU',
    'America/Toronto': 'CA', 'America/Vancouver': 'CA',
    'Europe/Amsterdam': 'NL', 'Asia/Seoul': 'KR',
    'Asia/Riyadh': 'SA', 'Europe/Istanbul': 'TR',
    'Africa/Johannesburg': 'ZA', 'Africa/Lagos': 'NG',
};

function detectCountry(): string {
    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        return TIMEZONE_TO_COUNTRY[tz] || 'US';
    } catch {
        return 'US';
    }
}

function getCurrencySymbol(currency: string): string {
    const map: Record<string, string> = {
        USD: '$', EUR: '€', GBP: '£', JPY: '¥', INR: '₹', KRW: '₩',
        BRL: 'R$', AUD: 'A$', CAD: 'C$', TRY: '₺', ZAR: 'R', NGN: '₦', SAR: 'SAR ',
    };
    return map[currency] || '$';
}

interface CalculatorProps {
    oilPrice: number | null;
}

export default function Calculator({ oilPrice }: CalculatorProps) {
    const [selectedCountry, setSelectedCountry] = useState('US');
    const [copied, setCopied] = useState(false);
    const [showPersonalize, setShowPersonalize] = useState(false);
    const [milesPerYear, setMilesPerYear] = useState<string>('');
    const [mpg, setMpg] = useState<string>('');
    const [showPreview, setShowPreview] = useState(false);
    const price = oilPrice ?? 82.15;

    // Auto-detect country on mount
    useEffect(() => {
        const detected = detectCountry();
        if (COUNTRIES[detected]) {
            setSelectedCountry(detected);
        }
    }, []);

    const isUS = selectedCountry === 'US';

    // Compute per-unit impact
    const impact = useMemo(() => {
        const country = COUNTRIES[selectedCountry];
        if (!country) return null;
        const priceDelta = price - BRENT_BASELINE;
        const projectedIncrease = Math.max(0, priceDelta * country.pt);

        // Compute annual impact
        // For US: pt is $/gal, convert to per-liter for annual: 1 gal = 3.785 L
        const perLiter = isUS ? projectedIncrease / 3.785 : projectedIncrease;
        const annualImpact = perLiter * country.litersPerYear;
        const monthlyImpact = annualImpact / 12;

        return {
            ...country,
            projectedIncrease,
            projectedPrice: country.currentPrice + projectedIncrease,
            annualImpact,
            monthlyImpact,
        };
    }, [selectedCountry, price, isUS]);

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

    // Share text
    const getShareText = useCallback(() => {
        if (!impact) return '';
        const sym = getCurrencySymbol(impact.currency);
        const annualStr = impact.annualImpact >= 100
            ? Math.round(impact.annualImpact)
            : impact.annualImpact.toFixed(0);

        return `🔴 The Hormuz blockade will cost the ${impact.label} +${sym}${annualStr}/year in fuel costs.\n\nSee your country's impact: hormuz.watch/?country=${selectedCountry}\n#HormuzWatch #OilCrisis`;
    }, [impact, selectedCountry]);

    const shareUrl = `https://hormuz.watch/?country=${selectedCountry}&utm_source=share`;

    const handleTwitter = () => {
        const text = getShareText();
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
    };

    const handleWhatsApp = () => {
        const text = getShareText();
        window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + shareUrl)}`, '_blank');
    };

    const handleTelegram = () => {
        const text = getShareText();
        window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`, '_blank');
    };

    const handleCopy = async () => {
        const text = getShareText();
        try {
            await navigator.clipboard.writeText(text + ' ' + shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* fallback */ }
    };

    if (!impact) return null;

    const sym = getCurrencySymbol(impact.currency);
    const annualDisplay = impact.annualImpact >= 100
        ? Math.round(impact.annualImpact).toLocaleString('en-US')
        : impact.annualImpact.toFixed(0);
    const monthlyDisplay = impact.monthlyImpact >= 10
        ? Math.round(impact.monthlyImpact).toLocaleString('en-US')
        : impact.monthlyImpact.toFixed(0);

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

            {/* ── Annual Impact Hero (all countries) ── */}
            {impact.annualImpact > 0 && (
                <div className="calculator__annual-hero">
                    <div className="calculator__annual-hero-value">
                        +{sym}{annualDisplay}<span className="calculator__annual-hero-unit">/year</span>
                    </div>
                    <div className="calculator__annual-hero-sub">
                        ≈ {sym}{monthlyDisplay}/month
                    </div>
                    <div className="calculator__annual-hero-label">
                        {impact.flag} {impact.label}
                    </div>
                </div>
            )}

            {/* ── US-specific temporal framing ── */}
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

            {/* ── Share Preview ── */}
            <div className="calculator__share-preview">
                <div className="calculator__share-preview-header">
                    <div className="calculator__share-preview-title">
                        {impact.flag} HORMUZ BLOCKADE
                    </div>
                    <div className="calculator__share-preview-amount">
                        +{sym}{annualDisplay}/year
                    </div>
                    <div className="calculator__share-preview-domain">
                        hormuz.watch
                    </div>
                </div>
                <div className="calculator__share-preview-footer">
                    Share what your friends will see ↓
                </div>
            </div>

            {/* ── Platform Share Buttons ── */}
            <div className="calculator__share-buttons">
                <button className="share-btn share-btn--twitter" onClick={handleTwitter}>
                    𝕏
                </button>
                <button className="share-btn share-btn--whatsapp" onClick={handleWhatsApp}>
                    WhatsApp
                </button>
                <button className="share-btn share-btn--telegram" onClick={handleTelegram}>
                    Telegram
                </button>
                <button className="share-btn share-btn--copy" onClick={handleCopy}>
                    {copied ? '✓' : 'Copy'}
                </button>
            </div>
        </div>
    );
}
