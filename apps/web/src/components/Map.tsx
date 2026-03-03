'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';

// Types
interface VesselData {
    mmsi: number;
    shipName: string;
    lat: number;
    lon: number;
    sog: number;
    cog: number;
    status: string;
    ts: number;
}

interface MapProps {
    apiUrl?: string;
    onVesselCount?: (count: number) => void;
}

// Mock vessels for demo (realistic positions in/near Strait of Hormuz)
const MOCK_VESSELS: VesselData[] = [
    { mmsi: 211000001, shipName: "PACIFIC VOYAGER", lat: 26.55, lon: 56.25, sog: 0.1, cog: 180, status: "anchored", ts: Date.now() },
    { mmsi: 211000002, shipName: "CRUDE SPIRIT", lat: 26.40, lon: 56.35, sog: 0.0, cog: 90, status: "anchored", ts: Date.now() },
    { mmsi: 211000003, shipName: "GULF PIONEER", lat: 26.22, lon: 56.50, sog: 12.5, cog: 135, status: "underway", ts: Date.now() },
    { mmsi: 211000004, shipName: "ORIENTAL GRACE", lat: 26.10, lon: 56.65, sog: 0.2, cog: 270, status: "anchored", ts: Date.now() },
    { mmsi: 211000005, shipName: "SEA DIAMOND", lat: 25.95, lon: 56.80, sog: 0.0, cog: 0, status: "anchored", ts: Date.now() },
    { mmsi: 211000006, shipName: "HORMUZ STAR", lat: 26.60, lon: 56.10, sog: 8.2, cog: 45, status: "underway", ts: Date.now() },
    { mmsi: 211000007, shipName: "ENERGY TITAN", lat: 25.80, lon: 57.00, sog: 0.1, cog: 180, status: "anchored", ts: Date.now() },
    { mmsi: 211000008, shipName: "CRUDE CARRIER III", lat: 26.35, lon: 56.45, sog: 0.0, cog: 90, status: "anchored", ts: Date.now() },
    { mmsi: 211000009, shipName: "DESERT FALCON", lat: 26.70, lon: 55.90, sog: 0.3, cog: 180, status: "anchored", ts: Date.now() },
    { mmsi: 211000010, shipName: "PERSIAN GULF", lat: 25.60, lon: 57.20, sog: 11.0, cog: 315, status: "underway", ts: Date.now() },
    { mmsi: 211000011, shipName: "AL DAFRA", lat: 26.48, lon: 56.30, sog: 0.0, cog: 0, status: "anchored", ts: Date.now() },
    { mmsi: 211000012, shipName: "MARITIME GLORY", lat: 26.15, lon: 56.55, sog: 0.1, cog: 90, status: "anchored", ts: Date.now() },
    { mmsi: 211000013, shipName: "JADE DRAGON", lat: 25.70, lon: 57.10, sog: 0.0, cog: 270, status: "anchored", ts: Date.now() },
    { mmsi: 211000014, shipName: "NORDIC EXPLORER", lat: 26.80, lon: 55.80, sog: 14.2, cog: 160, status: "underway", ts: Date.now() },
    { mmsi: 211000015, shipName: "STANCHION BRAVE", lat: 26.30, lon: 56.40, sog: 0.1, cog: 180, status: "anchored", ts: Date.now() },
    { mmsi: 211000016, shipName: "ANWAR", lat: 26.05, lon: 56.70, sog: 0.0, cog: 0, status: "anchored", ts: Date.now() },
    { mmsi: 211000017, shipName: "CHANG JIANG", lat: 25.55, lon: 57.30, sog: 0.2, cog: 90, status: "anchored", ts: Date.now() },
    { mmsi: 211000018, shipName: "ORION TRADER", lat: 26.65, lon: 56.05, sog: 0.0, cog: 180, status: "anchored", ts: Date.now() },
    { mmsi: 211000019, shipName: "CORAL SEA", lat: 26.42, lon: 56.32, sog: 9.8, cog: 200, status: "underway", ts: Date.now() },
    { mmsi: 211000020, shipName: "BLUE NILE", lat: 25.85, lon: 56.95, sog: 0.0, cog: 0, status: "anchored", ts: Date.now() },
    { mmsi: 211000021, shipName: "GOLDEN BRIDGE", lat: 26.58, lon: 56.18, sog: 0.1, cog: 90, status: "anchored", ts: Date.now() },
    { mmsi: 211000022, shipName: "SUEZ EAGLE", lat: 26.25, lon: 56.48, sog: 0.0, cog: 270, status: "anchored", ts: Date.now() },
    { mmsi: 211000023, shipName: "ARABIAN KNIGHT", lat: 25.90, lon: 56.85, sog: 0.2, cog: 180, status: "anchored", ts: Date.now() },
    { mmsi: 211000024, shipName: "VISHWA DEEP", lat: 26.50, lon: 56.28, sog: 13.1, cog: 120, status: "underway", ts: Date.now() },
    { mmsi: 211000025, shipName: "AEGEAN WAVE", lat: 25.75, lon: 57.05, sog: 0.0, cog: 0, status: "anchored", ts: Date.now() },
    { mmsi: 211000026, shipName: "FUJAIRAH PRIDE", lat: 25.20, lon: 56.38, sog: 0.0, cog: 0, status: "anchored", ts: Date.now() },
    { mmsi: 211000027, shipName: "MUSCAT BAY", lat: 25.25, lon: 56.42, sog: 0.1, cog: 90, status: "anchored", ts: Date.now() },
    { mmsi: 211000028, shipName: "DAMMAM EXPRESS", lat: 25.30, lon: 56.35, sog: 0.0, cog: 0, status: "anchored", ts: Date.now() },
    { mmsi: 211000029, shipName: "RAS LAFFAN LNG", lat: 26.00, lon: 56.60, sog: 0.0, cog: 180, status: "anchored", ts: Date.now() },
    { mmsi: 211000030, shipName: "KHARG ISLAND", lat: 26.75, lon: 55.85, sog: 0.0, cog: 0, status: "anchored", ts: Date.now() },
];

// The actual Leaflet map component (client-only)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const L = typeof window !== 'undefined' ? require('leaflet') : null;

function LeafletMapInner({ vessels }: { vessels: VesselData[] }) {
    const mapRef = useRef<L.Map | null>(null);
    const markersRef = useRef<L.CircleMarker[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!L || !containerRef.current) return;

        if (mapRef.current) return;

        const map = L.map(containerRef.current, {
            center: [26.0, 56.5],
            zoom: 8,
            zoomControl: true,
            attributionControl: true,
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19,
        }).addTo(map);

        // Hormuz Strait shipping lane outline
        const straitPath = [
            [26.58, 56.08],
            [26.40, 56.30],
            [26.20, 56.50],
            [26.00, 56.60],
            [25.80, 56.80],
        ];
        L.polyline(straitPath as [number, number][], {
            color: 'rgba(239, 68, 68, 0.3)',
            weight: 40,
            opacity: 0.15,
            dashArray: '20, 10',
        }).addTo(map);

        // "BLOCKADE ZONE" label
        L.marker([26.3, 56.4] as [number, number], {
            icon: L.divIcon({
                html: '<div style="color: rgba(239,68,68,0.5); font-family: JetBrains Mono, monospace; font-size: 11px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; white-space: nowrap; text-shadow: 0 0 10px rgba(239,68,68,0.3);">⚠ BLOCKADE ZONE</div>',
                className: '',
                iconSize: [150, 20],
                iconAnchor: [75, 10],
            }),
        }).addTo(map);

        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, []);

    // Update vessel markers
    useEffect(() => {
        if (!mapRef.current || !L) return;
        const map = mapRef.current;

        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];

        vessels.forEach(v => {
            const color = v.status === 'anchored' ? '#f59e0b'
                : v.status === 'underway' ? '#22c55e'
                    : '#64748b';

            const marker = L.circleMarker([v.lat, v.lon] as [number, number], {
                radius: v.status === 'underway' ? 5 : 4,
                fillColor: color,
                fillOpacity: v.status === 'dark' ? 0.4 : 0.8,
                color: 'rgba(255,255,255,0.3)',
                weight: 1,
            }).addTo(map);

            marker.bindPopup(`
        <div class="vessel-popup">
          <strong>${v.shipName}</strong><br/>
          MMSI: ${v.mmsi}<br/>
          Status: <span style="color:${color}">${v.status.toUpperCase()}</span><br/>
          Speed: ${v.sog.toFixed(1)} kn | Course: ${v.cog.toFixed(0)}°<br/>
          <span style="color:#94a3b8;font-size:0.65rem;">Position delayed 15 min for crew safety</span>
        </div>
      `, { className: 'dark-popup' });

            markersRef.current.push(marker);
        });
    }, [vessels]);

    return <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: '450px' }} />;
}

// Dynamic import wrapper to prevent SSR
const LeafletMap = dynamic(
    () => Promise.resolve(LeafletMapInner),
    { ssr: false, loading: () => <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '450px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>Loading tactical map...</div> }
);

export default function Map({ apiUrl, onVesselCount }: MapProps) {
    const [vessels, setVessels] = useState<VesselData[]>(MOCK_VESSELS);
    const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
    const [isLive, setIsLive] = useState(false);

    useEffect(() => {
        if (!apiUrl) {
            onVesselCount?.(MOCK_VESSELS.length);
            return;
        }

        const fetchVessels = async () => {
            try {
                const res = await fetch(`${apiUrl}/vessels`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.vessels?.length > 0) {
                        setVessels(data.vessels);
                        setLastUpdated(data.lastUpdated || Date.now());
                        setIsLive(true);
                        onVesselCount?.(data.vessels.length);
                    }
                }
            } catch {
                // Use mock data on error
            }
        };

        fetchVessels();
        const interval = setInterval(fetchVessels, 30000);
        return () => clearInterval(interval);
    }, [apiUrl, onVesselCount]);

    const anchoredCount = vessels.filter(v => v.status === 'anchored').length;
    const underwayCount = vessels.filter(v => v.status === 'underway').length;
    const darkCount = vessels.filter(v => v.status === 'dark').length;

    return (
        <div className="map-container">
            <div className="map-container__header">
                <span>🗺️ Strait of Hormuz — Vessel Tracker</span>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Legend */}
                    <div className="map-legend">
                        <div className="map-legend__item">
                            <span className="map-legend__dot map-legend__dot--anchored" />
                            {anchoredCount} anchored
                        </div>
                        <div className="map-legend__item">
                            <span className="map-legend__dot map-legend__dot--underway" />
                            {underwayCount} transiting
                        </div>
                        {darkCount > 0 && (
                            <div className="map-legend__item">
                                <span className="map-legend__dot map-legend__dot--dark" />
                                {darkCount} AIS dark
                            </div>
                        )}
                    </div>
                    {/* Data status */}
                    <div className="map-container__live">
                        <span className="map-container__live-dot" />
                        <span className="map-status">
                            {isLive
                                ? `AIS DATA: LIVE │ ${vessels.length} vessels │ 15-min delay`
                                : `AIS DATA: SIMULATED │ ${vessels.length} vessels │ Live feed connecting…`
                            }
                        </span>
                    </div>
                </div>
            </div>
            <div className="map-wrapper">
                <LeafletMap vessels={vessels} />
            </div>
        </div>
    );
}
