'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
    createGameState,
    addVote,
    posteriorMean,
    smoothDistribution,
    expectedEndDate,
} from '@hormuz-watch/shared';
import type { PredictionGameState } from '@hormuz-watch/shared';

/** Crisis start: Feb 28, 2026, 06:00 UTC */
const CRISIS_START_MS = new Date('2026-02-28T06:00:00Z').getTime();
const MS_PER_DAY = 86_400_000;

/** Total horizon: 180 days from crisis start */
const HORIZON_DAYS = 180;

/**
 * Generate some seed votes to make the chart look interesting out of the box.
 * In production this would come from KV / Upstash.
 */
function generateDemoVotes(state: PredictionGameState) {
    // Cluster 1: optimistic (30-60 days)
    for (let i = 0; i < 25; i++) {
        const bin = 30 + Math.floor(Math.random() * 30);
        addVote(state, bin);
    }
    // Cluster 2: moderate (60-120 days)
    for (let i = 0; i < 40; i++) {
        const bin = 60 + Math.floor(Math.random() * 60);
        addVote(state, bin);
    }
    // Cluster 3: pessimistic (120-180 days)
    for (let i = 0; i < 15; i++) {
        const bin = 120 + Math.floor(Math.random() * 60);
        addVote(state, bin);
    }
}

function formatDate(ms: number): string {
    return new Date(ms).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

export default function PredictionGame() {
    // ── State ──
    const [gameState, setGameState] = useState<PredictionGameState>(() => {
        const s = createGameState(HORIZON_DAYS, 0.5);
        generateDemoVotes(s);
        return s;
    });

    const [selectedBin, setSelectedBin] = useState<number | null>(null);
    const [hasVoted, setHasVoted] = useState(false);
    const [hoverBin, setHoverBin] = useState<number | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // ── Computed ──
    const distribution = useMemo(() => {
        const raw = posteriorMean(gameState);
        return smoothDistribution(raw, 3);
    }, [gameState]);

    const summary = useMemo(() => {
        return expectedEndDate(gameState, CRISIS_START_MS);
    }, [gameState]);

    // ── Canvas Drawing ──
    const drawChart = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const W = rect.width;
        const H = rect.height;
        const pad = { top: 10, bottom: 30, left: 8, right: 8 };
        const chartW = W - pad.left - pad.right;
        const chartH = H - pad.top - pad.bottom;

        // Clear
        ctx.clearRect(0, 0, W, H);

        // Find max probability for scaling
        let maxP = 0;
        for (let k = 0; k < distribution.length; k++) {
            if (distribution[k] > maxP) maxP = distribution[k];
        }
        if (maxP === 0) maxP = 1;

        const barW = chartW / HORIZON_DAYS;

        // Draw bars
        for (let k = 0; k < HORIZON_DAYS; k++) {
            const p = distribution[k];
            const barH = (p / maxP) * chartH;
            const x = pad.left + k * barW;
            const y = pad.top + chartH - barH;

            // Color gradient: cyan → amber → red based on how far out
            const t = k / HORIZON_DAYS;
            let r: number, g: number, b: number;
            if (t < 0.5) {
                // cyan to amber
                const s = t * 2;
                r = Math.round(6 + s * (245 - 6));
                g = Math.round(182 + s * (158 - 182));
                b = Math.round(212 + s * (11 - 212));
            } else {
                // amber to red
                const s = (t - 0.5) * 2;
                r = Math.round(245 + s * (239 - 245));
                g = Math.round(158 + s * (68 - 158));
                b = Math.round(11 + s * (68 - 11));
            }

            const isHover = hoverBin === k;
            const isSelected = selectedBin === k;
            const alpha = isHover || isSelected ? 1.0 : 0.7;

            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            ctx.fillRect(x, y, Math.max(barW - 0.5, 1), barH);

            // Glow on hover
            if (isHover) {
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.3)`;
                ctx.fillRect(x - 1, pad.top, barW + 2, chartH);
            }
        }

        // Draw median line
        const medianX = pad.left + summary.medianBin * barW;
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(medianX, pad.top);
        ctx.lineTo(medianX, pad.top + chartH);
        ctx.stroke();
        ctx.setLineDash([]);

        // Median label
        ctx.fillStyle = '#06b6d4';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('MEDIAN', medianX, pad.top + chartH + 12);

        // X-axis labels (every 30 days)
        ctx.fillStyle = '#64748b';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        for (let d = 0; d <= HORIZON_DAYS; d += 30) {
            const x = pad.left + d * barW;
            const dt = new Date(CRISIS_START_MS + d * MS_PER_DAY);
            const label = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            ctx.fillText(label, x, pad.top + chartH + 24);
        }
    }, [distribution, summary, hoverBin, selectedBin]);

    useEffect(() => {
        drawChart();
    }, [drawChart]);

    // Handle resize
    useEffect(() => {
        const handleResize = () => drawChart();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [drawChart]);

    // ── Mouse interaction on canvas ──
    const handleCanvasMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const pad = 8;
        const barW = (rect.width - pad * 2) / HORIZON_DAYS;
        const bin = Math.floor((x - pad) / barW);
        if (bin >= 0 && bin < HORIZON_DAYS) {
            setHoverBin(bin);
        } else {
            setHoverBin(null);
        }
    };

    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const pad = 8;
        const barW = (rect.width - pad * 2) / HORIZON_DAYS;
        const bin = Math.floor((x - pad) / barW);
        if (bin >= 0 && bin < HORIZON_DAYS) {
            setSelectedBin(bin);
        }
    };

    // ── Vote ──
    const handleVote = () => {
        if (selectedBin === null) return;
        const newState = { ...gameState, counts: new Float64Array(gameState.counts) };
        addVote(newState, selectedBin);
        newState.total = gameState.total + 1;
        setGameState(newState);
        setHasVoted(true);
    };

    // ── Tooltip ──
    const tooltipInfo = hoverBin !== null ? {
        date: formatDate(CRISIS_START_MS + hoverBin * MS_PER_DAY),
        prob: (distribution[hoverBin] * 100).toFixed(2),
        day: hoverBin,
    } : null;

    return (
        <div className="prediction-game">
            <div className="prediction-game__title">🎯 When Does the Blockade End?</div>
            <div className="prediction-game__subtitle">Community forecast — tap the chart to vote</div>

            {/* Chart */}
            <div className="prediction-game__chart-wrapper">
                <canvas
                    ref={canvasRef}
                    className="prediction-game__chart"
                    onMouseMove={handleCanvasMove}
                    onMouseLeave={() => setHoverBin(null)}
                    onClick={handleCanvasClick}
                />
                {tooltipInfo && (
                    <div className="prediction-game__tooltip">
                        <strong>{tooltipInfo.date}</strong> (Day {tooltipInfo.day})
                        <br />
                        {tooltipInfo.prob}% probability
                    </div>
                )}
            </div>

            {/* Stats */}
            <div className="prediction-game__stats">
                <div className="prediction-game__stat">
                    <span className="prediction-game__stat-label">Community Median</span>
                    <span className="prediction-game__stat-value prediction-game__stat-value--cyan">
                        {formatDate(summary.medianMs)}
                    </span>
                </div>
                <div className="prediction-game__stat">
                    <span className="prediction-game__stat-label">Expected Date</span>
                    <span className="prediction-game__stat-value">
                        {formatDate(summary.expectedMs)}
                    </span>
                </div>
                <div className="prediction-game__stat">
                    <span className="prediction-game__stat-label">Uncertainty</span>
                    <span className="prediction-game__stat-value">
                        ±{Math.round(summary.stdDevDays)} days
                    </span>
                </div>
                <div className="prediction-game__stat">
                    <span className="prediction-game__stat-label">Total Votes</span>
                    <span className="prediction-game__stat-value prediction-game__stat-value--amber">
                        {Math.round(summary.totalVotes)}
                    </span>
                </div>
            </div>

            {/* Vote Action */}
            <div className="prediction-game__vote">
                {selectedBin !== null && (
                    <div className="prediction-game__vote-selection">
                        Your pick: <strong>{formatDate(CRISIS_START_MS + selectedBin * MS_PER_DAY)}</strong>
                    </div>
                )}
                <button
                    className="prediction-game__vote-btn"
                    onClick={handleVote}
                    disabled={selectedBin === null || hasVoted}
                >
                    {hasVoted
                        ? '✓ Vote recorded!'
                        : selectedBin !== null
                            ? 'Submit your prediction'
                            : 'Tap the chart to pick a date'}
                </button>
            </div>
        </div>
    );
}
