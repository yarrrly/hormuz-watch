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
