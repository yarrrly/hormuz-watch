import type { CountryData } from './types';

export const BRENT_BASELINE = 73; // Pre-crisis average $/bbl

export const COUNTRIES: Record<string, CountryData> = {
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

export const COUNTRY_CODES = Object.keys(COUNTRIES);
