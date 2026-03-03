/**
 * Prediction Game — Dirichlet-Multinomial crowd forecast
 * with optional KDE smoothing and LMSR market maker.
 *
 * Edge-computable: O(K) per query, O(1) per vote.
 * K ≤ 365 daily bins.
 */

import type {
    PredictionGameState,
    LMSRState,
    GameBinResult,
    PredictionSummary,
} from './types';

// ── Dirichlet-Multinomial ──────────────────────────────────────

/**
 * Create a new game state with K daily bins and symmetric Dirichlet prior α₀.
 * Default α₀ = 1 (Laplace smoothing).
 */
export function createGameState(K: number, alpha0: number = 1): PredictionGameState {
    return {
        K,
        alpha0,
        counts: new Float64Array(K),
        total: 0,
    };
}

/**
 * Add a (possibly weighted) vote to bin k.
 */
export function addVote(
    state: PredictionGameState,
    bin: number,
    weight: number = 1,
): void {
    if (bin < 0 || bin >= state.K) return;
    state.counts[bin] += weight;
    state.total += weight;
}

/**
 * Add multiple votes at once (batch).
 */
export function addVotes(
    state: PredictionGameState,
    votes: Array<{ bin: number; weight?: number }>,
): void {
    for (const v of votes) {
        addVote(state, v.bin, v.weight ?? 1);
    }
}

/**
 * Posterior mean: E[p_k | votes] = (α₀ + c_k) / (K·α₀ + total)
 */
export function posteriorMean(state: PredictionGameState): Float64Array {
    const { K, alpha0, counts, total } = state;
    const denom = K * alpha0 + total;
    const p = new Float64Array(K);
    for (let k = 0; k < K; k++) {
        p[k] = (alpha0 + counts[k]) / denom;
    }
    return p;
}

// ── KDE Smoothing ──────────────────────────────────────────────

/**
 * Discrete Gaussian smoothing over bins.
 * h = bandwidth in days (default 2), D = 3h truncation radius.
 */
export function smoothDistribution(
    p: Float64Array,
    hDays: number = 2,
): Float64Array {
    const K = p.length;
    const D = Math.max(1, Math.round(3 * hDays));

    // Pre-compute kernel weights
    const w: number[] = [];
    let wsum = 0;
    for (let d = -D; d <= D; d++) {
        const wd = Math.exp(-(d * d) / (2 * hDays * hDays));
        w.push(wd);
        wsum += wd;
    }
    for (let i = 0; i < w.length; i++) w[i] /= wsum;

    // Convolve
    const out = new Float64Array(K);
    for (let k = 0; k < K; k++) {
        let s = 0;
        for (let idx = 0; idx < w.length; idx++) {
            const d = idx - D;
            const j = k + d;
            if (j >= 0 && j < K) s += w[idx] * p[j];
        }
        out[k] = s;
    }

    // Renormalize
    let sum = 0;
    for (let k = 0; k < K; k++) sum += out[k];
    if (sum > 0) {
        for (let k = 0; k < K; k++) out[k] /= sum;
    }
    return out;
}

// ── Beta Credible Intervals ────────────────────────────────────

/**
 * Approximate Beta quantile using normal approximation.
 * For Beta(α, β), mean = α/(α+β), var = αβ/((α+β)²(α+β+1))
 */
function betaQuantile(alpha: number, beta: number, p: number): number {
    const mean = alpha / (alpha + beta);
    const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
    const sd = Math.sqrt(variance);
    // Normal inverse CDF approximation (Beasley-Springer-Moro)
    const z = normalInvCdf(p);
    return Math.max(0, Math.min(1, mean + z * sd));
}

/**
 * Rational approximation of the normal inverse CDF (probit).
 */
function normalInvCdf(p: number): number {
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;

    // Abramowitz and Stegun approximation 26.2.23
    if (p < 0.5) return -normalInvCdfUpper(1 - p);
    return normalInvCdfUpper(p);
}

function normalInvCdfUpper(p: number): number {
    const a = [
        -3.969683028665376e1,
        2.209460984245205e2,
        -2.759285104469687e2,
        1.383577518672690e2,
        -3.066479806614716e1,
        2.506628277459239e0,
    ];
    const b = [
        -5.447609879822406e1,
        1.615858368580409e2,
        -1.556989798598866e2,
        6.680131188771972e1,
        -1.328068155288572e1,
    ];
    const c = [
        -7.784894002430293e-3,
        -3.223964580411365e-1,
        -2.400758277161838e0,
        -2.549732539343734e0,
        4.374664141464968e0,
        2.938163982698783e0,
    ];
    const d = [
        7.784695709041462e-3,
        3.224671290700398e-1,
        2.445134137142996e0,
        3.754408661907416e0,
    ];

    const pLow = 0.02425;
    const pHigh = 1 - pLow;

    let q: number, r: number;

    if (p < pLow) {
        q = Math.sqrt(-2 * Math.log(p));
        return (
            (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
            ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
        );
    } else if (p <= pHigh) {
        q = p - 0.5;
        r = q * q;
        return (
            ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
            (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
        );
    } else {
        q = Math.sqrt(-2 * Math.log(1 - p));
        return -(
            (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
            ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
        );
    }
}

/**
 * 95% credible interval for a single bin p_k ~ Beta(α'_k, A - α'_k).
 */
export function betaCredibleInterval(
    state: PredictionGameState,
    bin: number,
    level: number = 0.95,
): { low: number; high: number; mean: number } {
    const A = state.K * state.alpha0 + state.total;
    const alphaPrime = state.alpha0 + (bin >= 0 && bin < state.K ? state.counts[bin] : 0);
    const betaPrime = A - alphaPrime;

    const tail = (1 - level) / 2;
    return {
        low: betaQuantile(alphaPrime, betaPrime, tail),
        high: betaQuantile(alphaPrime, betaPrime, 1 - tail),
        mean: alphaPrime / A,
    };
}

/**
 * Cumulative probability up to (and including) day m:
 * F_m ~ Beta(Σ_{k≤m} α'_k, Σ_{k>m} α'_k)
 */
export function cumulativeBeta(
    state: PredictionGameState,
    m: number,
): { alphaSum: number; betaSum: number; mean: number } {
    const { K, alpha0, counts } = state;
    let alphaSum = 0;
    let betaSum = 0;

    for (let k = 0; k < K; k++) {
        const ap = alpha0 + counts[k];
        if (k <= m) {
            alphaSum += ap;
        } else {
            betaSum += ap;
        }
    }

    return {
        alphaSum,
        betaSum,
        mean: alphaSum / (alphaSum + betaSum),
    };
}

/**
 * Expected end date E[T] and Var(T) using O(K) Dirichlet formula.
 * startDate is the epoch-ms of bin 0.
 * Returns { expectedMs, stdDevDays, medianBin }.
 */
export function expectedEndDate(
    state: PredictionGameState,
    startDateMs: number,
): PredictionSummary {
    const { K, alpha0, counts, total } = state;
    const A = K * alpha0 + total;
    const MS_PER_DAY = 86_400_000;

    // E[T] = Σ α'_k · t_k / A   (where t_k = k in days)
    let sumAlphaT = 0;
    let sumAlphaT2 = 0;
    let cumProb = 0;
    let medianBin = K - 1;
    let foundMedian = false;

    for (let k = 0; k < K; k++) {
        const ap = alpha0 + counts[k];
        sumAlphaT += ap * k;
        sumAlphaT2 += ap * k * k;

        // Find median bin
        if (!foundMedian) {
            cumProb += ap / A;
            if (cumProb >= 0.5) {
                medianBin = k;
                foundMedian = true;
            }
        }
    }

    const expectedDay = sumAlphaT / A;
    // Var(T) = [A · Σ α'_k t_k² − (Σ α'_k t_k)²] / [A²(A+1)]
    const varT = (A * sumAlphaT2 - sumAlphaT * sumAlphaT) / (A * A * (A + 1));
    const stdDevDays = Math.sqrt(Math.max(0, varT));

    return {
        expectedMs: startDateMs + expectedDay * MS_PER_DAY,
        expectedDay,
        stdDevDays,
        medianBin,
        medianMs: startDateMs + medianBin * MS_PER_DAY,
        totalVotes: total,
    };
}

/**
 * Compute full bin results (posterior + CI) for display.
 */
export function computeBinResults(
    state: PredictionGameState,
    smooth: boolean = true,
    hDays: number = 2,
): GameBinResult[] {
    let p = posteriorMean(state);
    if (smooth) {
        p = smoothDistribution(p, hDays);
    }

    const results: GameBinResult[] = [];
    for (let k = 0; k < state.K; k++) {
        const ci = betaCredibleInterval(state, k);
        results.push({
            bin: k,
            probability: p[k],
            ciLow: ci.low,
            ciHigh: ci.high,
        });
    }
    return results;
}

// ── LMSR Market Maker ──────────────────────────────────────────

/**
 * Create an LMSR state with K bins and liquidity parameter b.
 */
export function createLMSRState(K: number, b: number = 100): LMSRState {
    return {
        K,
        b,
        q: new Float64Array(K), // initially all zeros → uniform prices
    };
}

/**
 * LMSR implied probabilities (numerically stable softmax).
 */
export function lmsrPrices(m: LMSRState): Float64Array {
    const { K, b, q } = m;
    // Find max for numerical stability
    let max = -Infinity;
    for (let k = 0; k < K; k++) {
        const v = q[k] / b;
        if (v > max) max = v;
    }

    let sum = 0;
    const ex = new Float64Array(K);
    for (let k = 0; k < K; k++) {
        ex[k] = Math.exp(q[k] / b - max);
        sum += ex[k];
    }

    const p = new Float64Array(K);
    for (let k = 0; k < K; k++) p[k] = ex[k] / sum;
    return p;
}

/**
 * LMSR cost function: C(q) = b · ln(Σ exp(q_k/b))
 */
export function lmsrCost(m: LMSRState): number {
    const { K, b, q } = m;
    let max = -Infinity;
    for (let k = 0; k < K; k++) {
        const v = q[k] / b;
        if (v > max) max = v;
    }

    let sum = 0;
    for (let k = 0; k < K; k++) {
        sum += Math.exp(q[k] / b - max);
    }

    return b * (max + Math.log(sum));
}

/**
 * Execute a trade on the LMSR: buy `amount` shares of bin `k`.
 * Returns the cost (price paid) for this trade.
 */
export function lmsrTrade(m: LMSRState, bin: number, amount: number): number {
    if (bin < 0 || bin >= m.K) return 0;
    const costBefore = lmsrCost(m);
    m.q[bin] += amount;
    const costAfter = lmsrCost(m);
    return costAfter - costBefore;
}
