'use client';

import { useMemo, useState, useEffect } from 'react';

const BRENT_BASELINE = 73;

interface CountryInfo {
    code: string;
    name: string;
    flag: string;
    unit: string;
    pt: number;
    currency: string;
    litersPerYear: number;
    label: string;
}

const COUNTRY_DATA: Record<string, CountryInfo> = {
    US: { code: 'US', name: 'United States', flag: '🇺🇸', unit: '$/gal', pt: 0.025, currency: 'USD', litersPerYear: 4542, label: 'avg US household (1,200 gal/yr)' },
    UK: { code: 'UK', name: 'United Kingdom', flag: '🇬🇧', unit: '£/L', pt: 0.008, currency: 'GBP', litersPerYear: 1800, label: 'avg UK household' },
    DE: { code: 'DE', name: 'Germany', flag: '🇩🇪', unit: '€/L', pt: 0.009, currency: 'EUR', litersPerYear: 1500, label: 'avg German household' },
    FR: { code: 'FR', name: 'France', flag: '🇫🇷', unit: '€/L', pt: 0.009, currency: 'EUR', litersPerYear: 1400, label: 'avg French household' },
    JP: { code: 'JP', name: 'Japan', flag: '🇯🇵', unit: '¥/L', pt: 1.2, currency: 'JPY', litersPerYear: 1200, label: 'avg Japanese household' },
    IN: { code: 'IN', name: 'India', flag: '🇮🇳', unit: '₹/L', pt: 0.7, currency: 'INR', litersPerYear: 600, label: 'avg Indian household' },
    BR: { code: 'BR', name: 'Brazil', flag: '🇧🇷', unit: 'R$/L', pt: 0.04, currency: 'BRL', litersPerYear: 1100, label: 'avg Brazilian household' },
    AU: { code: 'AU', name: 'Australia', flag: '🇦🇺', unit: 'A$/L', pt: 0.012, currency: 'AUD', litersPerYear: 1600, label: 'avg Australian household' },
    CA: { code: 'CA', name: 'Canada', flag: '🇨🇦', unit: 'C$/L', pt: 0.011, currency: 'CAD', litersPerYear: 1700, label: 'avg Canadian household' },
    NL: { code: 'NL', name: 'Netherlands', flag: '🇳🇱', unit: '€/L', pt: 0.009, currency: 'EUR', litersPerYear: 1400, label: 'avg Dutch household' },
    KR: { code: 'KR', name: 'South Korea', flag: '🇰🇷', unit: '₩/L', pt: 10.5, currency: 'KRW', litersPerYear: 1300, label: 'avg Korean household' },
    SA: { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', unit: 'SAR/L', pt: 0.001, currency: 'SAR', litersPerYear: 2200, label: 'avg Saudi household' },
    TR: { code: 'TR', name: 'Turkey', flag: '🇹🇷', unit: '₺/L', pt: 0.25, currency: 'TRY', litersPerYear: 800, label: 'avg Turkish household' },
    ZA: { code: 'ZA', name: 'South Africa', flag: '🇿🇦', unit: 'R/L', pt: 0.15, currency: 'ZAR', litersPerYear: 900, label: 'avg South African household' },
    NG: { code: 'NG', name: 'Nigeria', flag: '🇳🇬', unit: '₦/L', pt: 5.0, currency: 'NGN', litersPerYear: 400, label: 'avg Nigerian household' },
};

// Map common timezones to country codes
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

interface PersonalTeaserProps {
    oilPrice: number | null;
    onScrollToCalculator?: () => void;
}

export default function PersonalTeaser({ oilPrice, onScrollToCalculator }: PersonalTeaserProps) {
    const [detectedCountry, setDetectedCountry] = useState('US');
    const price = oilPrice ?? 82.15;

    useEffect(() => {
        setDetectedCountry(detectCountry());
    }, []);

    const impact = useMemo(() => {
        const country = COUNTRY_DATA[detectedCountry];
        if (!country) return null;
        const priceDelta = price - BRENT_BASELINE;
        const perUnit = Math.max(0, priceDelta * country.pt);

        // For US, pt is in $/gal — convert to $/L for annual calc (1 gal = 3.785L)
        const perLiter = country.code === 'US' ? perUnit / 3.785 : perUnit;
        const annualImpact = perLiter * country.litersPerYear;
        const monthlyImpact = annualImpact / 12;

        return { country, perUnit, annualImpact, monthlyImpact };
    }, [detectedCountry, price]);

    if (!impact || impact.annualImpact <= 0) return null;

    const currencySymbol = impact.country.currency === 'USD' ? '$' :
        impact.country.currency === 'EUR' ? '€' :
            impact.country.currency === 'GBP' ? '£' :
                impact.country.currency === 'JPY' ? '¥' :
                    impact.country.currency === 'INR' ? '₹' :
                        impact.country.currency === 'KRW' ? '₩' :
                            impact.country.currency === 'BRL' ? 'R$' :
                                impact.country.currency === 'AUD' ? 'A$' :
                                    impact.country.currency === 'CAD' ? 'C$' :
                                        impact.country.currency === 'TRY' ? '₺' :
                                            impact.country.currency === 'ZAR' ? 'R' :
                                                impact.country.currency === 'NGN' ? '₦' :
                                                    impact.country.currency === 'SAR' ? 'SAR ' :
                                                        '$';

    const formatAmount = (n: number) => {
        if (n >= 10000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
        if (n >= 100) return Math.round(n).toString();
        return n.toFixed(n < 1 ? 2 : 0);
    };

    return (
        <div className="personal-teaser" onClick={onScrollToCalculator} role="button" tabIndex={0}>
            <div className="personal-teaser__content">
                <span className="personal-teaser__flag">{impact.country.flag}</span>
                <span className="personal-teaser__text">
                    Your fuel: +{impact.perUnit.toFixed(impact.perUnit < 1 ? 3 : 2)} {impact.country.unit}
                    {' → '}
                    <strong>+{currencySymbol}{formatAmount(impact.annualImpact)}/year</strong>
                    <span className="personal-teaser__monthly"> (+{currencySymbol}{formatAmount(impact.monthlyImpact)}/mo)</span>
                </span>
            </div>
            <span className="personal-teaser__cta">See your country ▼</span>
        </div>
    );
}
