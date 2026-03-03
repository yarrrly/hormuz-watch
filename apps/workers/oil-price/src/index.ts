interface Env {
    HORMUZ_KV: KVNamespace;
    TWELVE_DATA_API_KEY: string;
    TWELVE_DATA_SYMBOL: string;
    UPSTASH_REDIS_REST_URL: string;
    UPSTASH_REDIS_REST_TOKEN: string;
}

interface OilPriceData {
    price: number;
    changePct: number;
    previousClose: number;
    ts: number;
}

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: CORS_HEADERS });
        }

        const url = new URL(request.url);

        if (url.pathname === '/price') {
            // Serve cached oil price
            const cached = await env.HORMUZ_KV.get('oil:brent', 'json') as OilPriceData | null;
            if (cached) {
                return Response.json(cached, { headers: CORS_HEADERS });
            }
            // If no cache, try fetching live
            const data = await fetchOilPrice(env);
            if (data) {
                return Response.json(data, { headers: CORS_HEADERS });
            }
            return Response.json(
                { error: 'Oil price data unavailable', fallback: { price: 82.15, changePct: 2.3, ts: Date.now() } },
                { status: 503, headers: CORS_HEADERS }
            );
        }

        if (url.pathname === '/health') {
            return Response.json({ status: 'ok', ts: Date.now() }, { headers: CORS_HEADERS });
        }

        return Response.json({ error: 'Not found' }, { status: 404, headers: CORS_HEADERS });
    },

    async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
        ctx.waitUntil(fetchAndCacheOilPrice(env));
    },
};

async function fetchOilPrice(env: Env): Promise<OilPriceData | null> {
    try {
        const symbol = env.TWELVE_DATA_SYMBOL || 'BZ';

        // Fetch current price
        const priceRes = await fetch(
            `https://api.twelvedata.com/price?symbol=${symbol}&apikey=${env.TWELVE_DATA_API_KEY}`
        );
        const priceData = await priceRes.json() as { price?: string; code?: number };
        if (!priceData.price) {
            console.error('Twelve Data price error:', priceData);
            return null;
        }

        // Fetch previous close for change %
        const quoteRes = await fetch(
            `https://api.twelvedata.com/quote?symbol=${symbol}&apikey=${env.TWELVE_DATA_API_KEY}`
        );
        const quoteData = await quoteRes.json() as {
            previous_close?: string;
            percent_change?: string;
            code?: number;
        };

        const price = parseFloat(priceData.price);
        const previousClose = quoteData.previous_close ? parseFloat(quoteData.previous_close) : price;
        const changePct = quoteData.percent_change
            ? parseFloat(quoteData.percent_change)
            : ((price - previousClose) / previousClose) * 100;

        return {
            price,
            changePct: Math.round(changePct * 100) / 100,
            previousClose,
            ts: Date.now(),
        };
    } catch (err) {
        console.error('Failed to fetch oil price:', err);
        return null;
    }
}

async function fetchAndCacheOilPrice(env: Env): Promise<void> {
    const data = await fetchOilPrice(env);
    if (!data) return;

    // Cache in KV (5 min TTL)
    await env.HORMUZ_KV.put('oil:brent', JSON.stringify(data), { expirationTtl: 300 });

    // Also cache in Upstash Redis
    if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
        try {
            await fetch(`${env.UPSTASH_REDIS_REST_URL}/SET/hormuz:oil:brent/${encodeURIComponent(JSON.stringify(data))}/EX/300`, {
                headers: { Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}` },
            });
        } catch (err) {
            console.error('Upstash Redis error:', err);
        }
    }

    console.log(`Oil price cached: $${data.price} (${data.changePct > 0 ? '+' : ''}${data.changePct}%)`);
}
