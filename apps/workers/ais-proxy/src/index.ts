interface Env {
    HORMUZ_KV: KVNamespace;
    AIS_PROXY: DurableObjectNamespace;
    AISSTREAM_API_KEY: string;
    UPSTASH_REDIS_REST_URL: string;
    UPSTASH_REDIS_REST_TOKEN: string;
}

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

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Upgrade',
};

// 15-minute delay for crew safety (ms)
const SAFETY_DELAY_MS = 15 * 60 * 1000;

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: CORS_HEADERS });
        }

        const url = new URL(request.url);

        // WebSocket upgrade → route to Durable Object
        if (request.headers.get('Upgrade') === 'websocket') {
            const id = env.AIS_PROXY.idFromName('hormuz-main');
            const stub = env.AIS_PROXY.get(id);
            return stub.fetch(request);
        }

        // REST: GET /vessels — serve cached vessel snapshot
        if (url.pathname === '/vessels') {
            const snapshot = await env.HORMUZ_KV.get('vessels:snapshot', 'json');
            if (snapshot) {
                return Response.json(snapshot, { headers: CORS_HEADERS });
            }
            // Fallback: collect individual vessel keys
            const vessels = await collectVesselsFromKV(env);
            return Response.json({
                vessels,
                lastUpdated: Date.now(),
                totalCount: vessels.length,
                anchoredCount: vessels.filter((v: VesselData) => v.status === 'anchored').length,
                underwayCount: vessels.filter((v: VesselData) => v.status === 'underway').length,
            }, { headers: CORS_HEADERS });
        }

        if (url.pathname === '/health') {
            return Response.json({ status: 'ok', ts: Date.now() }, { headers: CORS_HEADERS });
        }

        return Response.json({ error: 'Not found' }, { status: 404, headers: CORS_HEADERS });
    },
};

async function collectVesselsFromKV(env: Env): Promise<VesselData[]> {
    const indexRaw = await env.HORMUZ_KV.get('vessels:index');
    if (!indexRaw) return [];
    const mmsis: number[] = JSON.parse(indexRaw);
    const vessels: VesselData[] = [];
    for (const mmsi of mmsis.slice(0, 200)) {
        const v = await env.HORMUZ_KV.get(`vessels:${mmsi}`, 'json') as VesselData | null;
        if (v) vessels.push(v);
    }
    return vessels;
}

/**
 * Durable Object: AisProxyDO
 * Maintains persistent WebSocket to aisstream.io and broadcasts to connected clients.
 */
export class AisProxyDO {
    private state: DurableObjectState;
    private env: Env;
    private aisSocket: WebSocket | null = null;
    private vessels: Map<number, VesselData> = new Map();
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(state: DurableObjectState, env: Env) {
        this.state = state;
        this.env = env;
    }

    async fetch(request: Request): Promise<Response> {
        if (request.headers.get('Upgrade') === 'websocket') {
            const pair = new WebSocketPair();
            const [client, server] = [pair[0], pair[1]];

            this.state.acceptWebSocket(server);

            // Start AIS connection if not running
            this.ensureAisConnection();

            // Send current vessel snapshot immediately
            const snapshot = Array.from(this.vessels.values())
                .filter(v => v.ts < Date.now() - SAFETY_DELAY_MS) // only delayed positions
                .map(v => ({ ...v }));

            server.send(JSON.stringify({
                type: 'snapshot',
                vessels: snapshot,
                ts: Date.now(),
            }));

            return new Response(null, { status: 101, webSocket: client });
        }

        // REST fallback
        const delayed = Array.from(this.vessels.values())
            .filter(v => v.ts < Date.now() - SAFETY_DELAY_MS);

        return Response.json({
            vessels: delayed,
            lastUpdated: Date.now(),
            totalCount: delayed.length,
            anchoredCount: delayed.filter(v => v.status === 'anchored').length,
            underwayCount: delayed.filter(v => v.status === 'underway').length,
        }, { headers: CORS_HEADERS });
    }

    private ensureAisConnection(): void {
        if (this.aisSocket && this.aisSocket.readyState === WebSocket.OPEN) return;

        try {
            const socket = new WebSocket('wss://stream.aisstream.io/v0/stream');

            socket.addEventListener('open', () => {
                console.log('AIS stream connected');
                const subscription = {
                    Apikey: this.env.AISSTREAM_API_KEY,
                    BoundingBoxes: [[[24.0, 54.0], [27.0, 58.0]]],
                    FilterMessageTypes: ['PositionReport'],
                };
                socket.send(JSON.stringify(subscription));
            });

            socket.addEventListener('message', (event) => {
                this.handleAisMessage(event.data as string);
            });

            socket.addEventListener('close', () => {
                console.log('AIS stream disconnected, reconnecting in 5s...');
                this.aisSocket = null;
                this.scheduleReconnect();
            });

            socket.addEventListener('error', (err) => {
                console.error('AIS stream error:', err);
                socket.close();
            });

            this.aisSocket = socket;
        } catch (err) {
            console.error('Failed to connect to AIS stream:', err);
            this.scheduleReconnect();
        }
    }

    private scheduleReconnect(): void {
        if (this.reconnectTimer) return;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.ensureAisConnection();
        }, 5000);
    }

    private handleAisMessage(raw: string): void {
        try {
            const msg = JSON.parse(raw);
            if (msg.MessageType !== 'PositionReport') return;

            const meta = msg.MetaData;
            const pos = msg.Message?.PositionReport;
            if (!meta || !pos) return;

            const vessel: VesselData = {
                mmsi: meta.MMSI,
                shipName: meta.ShipName?.trim() || `MMSI-${meta.MMSI}`,
                lat: pos.Latitude,
                lon: pos.Longitude,
                sog: pos.Sog || 0,
                cog: pos.Cog || 0,
                status: this.parseNavStatus(pos.NavigationalStatus),
                ts: Date.now(),
            };

            this.vessels.set(vessel.mmsi, vessel);

            // Broadcast delayed position to connected clients
            const delayedVessel = { ...vessel, ts: vessel.ts - SAFETY_DELAY_MS };
            const broadcast = JSON.stringify({ type: 'update', vessel: delayedVessel });

            for (const ws of this.state.getWebSockets()) {
                try {
                    ws.send(broadcast);
                } catch {
                    // Client disconnected
                }
            }

            // Periodic KV sync (every 30 seconds, batch)
            this.syncToKV();
        } catch (err) {
            console.error('AIS message parse error:', err);
        }
    }

    private parseNavStatus(code: number | undefined): string {
        switch (code) {
            case 0: return 'underway';
            case 1: return 'anchored';
            case 5: return 'moored';
            default: return 'underway';
        }
    }

    private lastKvSync = 0;
    private async syncToKV(): Promise<void> {
        const now = Date.now();
        if (now - this.lastKvSync < 30_000) return;
        this.lastKvSync = now;

        // Apply safety delay
        const delayed = Array.from(this.vessels.values())
            .filter(v => v.ts < now - SAFETY_DELAY_MS);

        const snapshot = {
            vessels: delayed,
            lastUpdated: now,
            totalCount: delayed.length,
            anchoredCount: delayed.filter(v => v.status === 'anchored').length,
            underwayCount: delayed.filter(v => v.status === 'underway').length,
        };

        await this.env.HORMUZ_KV.put('vessels:snapshot', JSON.stringify(snapshot), { expirationTtl: 600 });

        // Update index
        const mmsis = delayed.map(v => v.mmsi);
        await this.env.HORMUZ_KV.put('vessels:index', JSON.stringify(mmsis), { expirationTtl: 600 });

        console.log(`KV synced: ${delayed.length} vessels`);
    }

    async webSocketMessage(ws: WebSocket, message: string): Promise<void> {
        // Client messages (future: subscribe to specific vessel, etc.)
    }

    async webSocketClose(ws: WebSocket): Promise<void> {
        // Cleanup handled by Hibernation API
    }
}
