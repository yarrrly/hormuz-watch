import { ImageResponse } from '@vercel/og';

const COUNTRY_FLAGS: Record<string, string> = {
    US: '🇺🇸', UK: '🇬🇧', DE: '🇩🇪', FR: '🇫🇷', JP: '🇯🇵',
    IN: '🇮🇳', BR: '🇧🇷', AU: '🇦🇺', CA: '🇨🇦', NL: '🇳🇱',
    KR: '🇰🇷', SA: '🇸🇦', TR: '🇹🇷', ZA: '🇿🇦', NG: '🇳🇬',
};

const COUNTRY_NAMES: Record<string, string> = {
    US: 'United States', UK: 'United Kingdom', DE: 'Germany', FR: 'France',
    JP: 'Japan', IN: 'India', BR: 'Brazil', AU: 'Australia', CA: 'Canada',
    NL: 'Netherlands', KR: 'South Korea', SA: 'Saudi Arabia', TR: 'Turkey',
    ZA: 'South Africa', NG: 'Nigeria',
};

export default {
    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET',
                },
            });
        }

        const country = url.searchParams.get('country') || 'US';
        const brent = url.searchParams.get('brent') || '82.15';
        const impact = url.searchParams.get('impact') || '180';
        const flag = url.searchParams.get('flag') || COUNTRY_FLAGS[country] || '🌍';
        const unit = url.searchParams.get('unit') || '$/year';
        const countryName = COUNTRY_NAMES[country] || country;

        // Compute days since crisis
        const crisisStart = new Date('2026-02-28T06:00:00Z').getTime();
        const daysSinceCrisis = Math.floor((Date.now() - crisisStart) / 86_400_000);

        const image = new ImageResponse(
            {
                type: 'div',
                props: {
                    style: {
                        width: '1200px',
                        height: '630px',
                        background: 'linear-gradient(135deg, #0a0e17 0%, #1a1a2e 50%, #0a0e17 100%)',
                        color: 'white',
                        fontFamily: 'monospace',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: '60px',
                        position: 'relative',
                    },
                    children: [
                        // Top accent line
                        {
                            type: 'div',
                            props: {
                                style: {
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: '4px',
                                    background: 'linear-gradient(90deg, #ef4444, #f59e0b, #ef4444)',
                                },
                            },
                        },
                        // Title
                        {
                            type: 'div',
                            props: {
                                style: {
                                    fontSize: '28px',
                                    color: '#ef4444',
                                    letterSpacing: '8px',
                                    textTransform: 'uppercase',
                                    fontWeight: 700,
                                },
                                children: `STRAIT OF HORMUZ — BLOCKED`,
                            },
                        },
                        // Day count
                        {
                            type: 'div',
                            props: {
                                style: {
                                    fontSize: '18px',
                                    color: '#94a3b8',
                                    marginTop: '8px',
                                    letterSpacing: '4px',
                                },
                                children: `DAY ${daysSinceCrisis}`,
                            },
                        },
                        // Country + impact label
                        {
                            type: 'div',
                            props: {
                                style: {
                                    fontSize: '32px',
                                    marginTop: '30px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                },
                                children: `${flag} ${countryName} fuel impact:`,
                            },
                        },
                        // Big impact number
                        {
                            type: 'div',
                            props: {
                                style: {
                                    fontSize: '96px',
                                    fontWeight: 'bold',
                                    color: '#f59e0b',
                                    marginTop: '16px',
                                    lineHeight: 1.1,
                                },
                                children: `+${impact} ${unit}`,
                            },
                        },
                        // Brent info
                        {
                            type: 'div',
                            props: {
                                style: {
                                    fontSize: '22px',
                                    color: '#94a3b8',
                                    marginTop: '30px',
                                },
                                children: `Brent crude: $${brent}/bbl`,
                            },
                        },
                        // Domain
                        {
                            type: 'div',
                            props: {
                                style: {
                                    fontSize: '20px',
                                    color: '#64748b',
                                    marginTop: '24px',
                                    letterSpacing: '2px',
                                },
                                children: 'hormuz.watch',
                            },
                        },
                        // Bottom accent line
                        {
                            type: 'div',
                            props: {
                                style: {
                                    position: 'absolute',
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    height: '4px',
                                    background: 'linear-gradient(90deg, #f59e0b, #ef4444, #f59e0b)',
                                },
                            },
                        },
                    ],
                },
            },
            { width: 1200, height: 630 }
        );

        // Cache for 1 hour
        const response = new Response(image.body, {
            headers: {
                'Content-Type': 'image/png',
                'Cache-Control': 'public, max-age=3600',
                'Access-Control-Allow-Origin': '*',
            },
        });

        return response;
    },
};
