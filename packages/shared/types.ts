export interface Vessel {
    mmsi: number;
    shipName: string;
    lat: number;
    lon: number;
    sog: number; // Speed over ground (knots)
    cog: number; // Course over ground
    status: VesselStatus;
    ts: number;  // Unix timestamp ms
}

export type VesselStatus = 'anchored' | 'underway' | 'moored' | 'dark';

export interface OilPrice {
    price: number;
    changePct: number;
    ts: number;
}

export interface BlockedStats {
    barrels: number;
    valueUsd: number;
    tankerCount: number;
    ts: number;
}

export interface CountryData {
    name: string;
    flag: string;
    unit: string;
    pt: number;          // pass-through coefficient
    currency: string;
    currentPrice: number;
}

export interface FuelImpact {
    country: string;
    currentPrice: number;
    projectedIncrease: number;
    projectedPrice: number;
    unit: string;
    flag: string;
}

export interface VesselSnapshot {
    vessels: Vessel[];
    lastUpdated: number;
    totalCount: number;
    anchoredCount: number;
    underwayCount: number;
}

// ── Share Card Framing ─────────────────────────────────────────

export type Framing = 'abs' | 'rel' | 'yr';

export interface ShareFramingInputs {
    deltaP: number;        // $/gal price increase
    P0: number;            // $/gal baseline price
    milesPerYear?: number; // optional user override
    mpg?: number;          // optional user override
}

export interface ShareFramingResult {
    abs: number;           // $/gal
    relPct: number;        // percentage
    perYear: number;       // $/year
    perMonth: number;      // $/month
    gallonsPerYear: number;
    chosenFraming: Framing;
    shareText: string;
}

// ── Prediction Game ────────────────────────────────────────────

export interface PredictionGameState {
    K: number;             // number of bins (days)
    alpha0: number;        // symmetric Dirichlet prior
    counts: Float64Array;  // c_k (weighted vote counts)
    total: number;         // Σ c_k
}

export interface LMSRState {
    K: number;
    b: number;             // liquidity parameter
    q: Float64Array;       // net shares outstanding per bin
}

export interface GameBinResult {
    bin: number;
    probability: number;
    ciLow: number;
    ciHigh: number;
}

export interface PredictionSummary {
    expectedMs: number;    // epoch-ms of expected end date
    expectedDay: number;   // expected day index
    stdDevDays: number;    // standard deviation in days
    medianBin: number;     // median bin index
    medianMs: number;      // epoch-ms of median date
    totalVotes: number;
}
