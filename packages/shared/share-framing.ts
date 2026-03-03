/**
 * Share Card Framing — edge-computable algorithms for
 * optimal presentation of fuel-price impact to maximize sharing.
 *
 * Based on Berger & Milkman (virality / arousal), EIA pricing,
 * and FHWA driving statistics.
 */

import type { ShareFramingInputs, ShareFramingResult, Framing } from './types';

// ── FHWA / EIA constants (US) ─────────────────────────────────
export const FHWA_ANNUAL_MILES = 11_106;   // miles/year (FHWA VM-1 2023)
export const FHWA_AVG_MPG = 22.6;          // miles/gallon
export const FHWA_AVG_GALLONS = 492;       // gallons/year (11106 / 22.6)
export const EIA_BASELINE_PRICE = 3.015;   // $/gal (EIA week of 2026-03-02)

// ── Behavioral priors ──────────────────────────────────────────
/** Intercept (log-odds baseline — keeps p low when shock is small) */
export const ALPHA_DEFAULT = -4.0;
/** Salience → log-odds lift (≈ ln(1.34) from Berger/Milkman anger coeff) */
export const BETA_DEFAULT = 0.29;
/** Credibility penalty (0 = off) */
export const KAPPA_DEFAULT = 0.0;
/** Zone-of-indifference scale (≈ 6% true shock before "noticeability" kicks in) */
export const X_STAR_DEFAULT = 0.06;

/** Format multipliers — γ_j (priors; tune via A/B) */
export const GAMMA_DEFAULT: Record<Framing, number> = {
  abs: 1.10,
  rel: 1.00,
  yr: 1.25,
};

// ── Core functions ─────────────────────────────────────────────

/** Derive annual gallons from user input or FHWA default */
export function annualGallons(inp: ShareFramingInputs): number {
  if (inp.milesPerYear && inp.mpg && inp.mpg > 0) {
    return inp.milesPerYear / inp.mpg;
  }
  return FHWA_AVG_GALLONS;
}

/** Compute all three framing values */
export function computeX(inp: ShareFramingInputs) {
  const G = annualGallons(inp);
  return {
    abs: inp.deltaP,                      // $/gal
    relPct: 100 * inp.deltaP / inp.P0,    // percentage
    perYear: inp.deltaP * G,              // $/year
    perMonth: (inp.deltaP * G) / 12,      // $/month
    gallonsPerYear: G,
  };
}

/** log(1 + x) — mirrors Math.log1p */
function log1p(x: number): number {
  return Math.log(1 + x);
}

/** Standard sigmoid */
function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

/**
 * Salience score S_j = γ_j · log(1 + X̃ / X*)
 * Log compresses huge values and handles "zone of indifference".
 */
export function salienceScore(
  shock: number,
  gamma: number,
  xStar: number = X_STAR_DEFAULT,
): number {
  return gamma * log1p(Math.abs(shock) / xStar);
}

/**
 * Predicted share probability for a given framing.
 * p_share(j) = σ(α + β·S_j − κ·S_j²)
 */
export function pShare(
  framing: Framing,
  shock: number,
  params: {
    alpha?: number;
    beta?: number;
    kappa?: number;
    xStar?: number;
    gamma?: Record<Framing, number>;
  } = {},
): number {
  const alpha = params.alpha ?? ALPHA_DEFAULT;
  const beta = params.beta ?? BETA_DEFAULT;
  const kappa = params.kappa ?? KAPPA_DEFAULT;
  const xStar = params.xStar ?? X_STAR_DEFAULT;
  const gamma = params.gamma ?? GAMMA_DEFAULT;

  const S = salienceScore(shock, gamma[framing], xStar);
  return sigmoid(alpha + beta * S - kappa * S * S);
}

/**
 * Choose the framing that maximizes predicted share probability.
 * Returns "yr" | "abs" | "rel".
 */
export function chooseFraming(
  inp: ShareFramingInputs,
  params?: Parameters<typeof pShare>[2],
): Framing {
  const shock = inp.deltaP / inp.P0; // true relative shock

  const pAbs = pShare('abs', shock, params);
  const pRel = pShare('rel', shock, params);
  const pYr = pShare('yr', shock, params);

  if (pYr >= pAbs && pYr >= pRel) return 'yr';
  if (pAbs >= pRel) return 'abs';
  return 'rel';
}

/**
 * Build the full ShareFramingResult with computed values and share text.
 */
export function buildShareResult(inp: ShareFramingInputs): ShareFramingResult {
  const x = computeX(inp);
  const framing = chooseFraming(inp);
  const shareText = formatShareCard(inp, framing);

  return {
    abs: x.abs,
    relPct: x.relPct,
    perYear: x.perYear,
    perMonth: x.perMonth,
    gallonsPerYear: x.gallonsPerYear,
    chosenFraming: framing,
    shareText,
  };
}

/**
 * Generate share text with primary + secondary framing labels.
 */
export function formatShareCard(
  inp: ShareFramingInputs,
  framing: Framing = 'yr',
): string {
  const x = computeX(inp);

  let primary: string;
  let secondary: string;

  switch (framing) {
    case 'yr':
      primary = `+$${Math.round(x.perYear)}/year (≈ $${Math.round(x.perMonth)}/month)`;
      secondary = `≈ +$${x.abs.toFixed(2)}/gal`;
      break;
    case 'abs':
      primary = `+$${x.abs.toFixed(2)}/gal`;
      secondary = `≈ +${x.relPct.toFixed(1)}%`;
      break;
    case 'rel':
      primary = `+${x.relPct.toFixed(1)}%`;
      secondary = `≈ +$${x.abs.toFixed(2)}/gal`;
      break;
  }

  return [
    `🔴 Strait of Hormuz BLOCKED`,
    ``,
    `🇺🇸 US fuel cost impact: ${primary}`,
    `(${secondary})`,
    ``,
    `Check your country: hormuz.watch`,
    `#HormuzWatch #OilCrisis`,
  ].join('\n');
}

// ── Thompson Sampling (per-framing bandit) ─────────────────────

export interface ThompsonArm {
  a: number; // successes + 1 (Beta prior α)
  b: number; // failures + 1 (Beta prior β)
}

export interface ThompsonState {
  arms: Record<Framing, ThompsonArm>;
}

/** Create initial Thompson state with uniform priors */
export function createThompsonState(): ThompsonState {
  return {
    arms: {
      abs: { a: 1, b: 1 },
      rel: { a: 1, b: 1 },
      yr: { a: 1, b: 1 },
    },
  };
}

/**
 * Sample from Beta(a,b) using the Jöhnk algorithm (no dependencies).
 * Good enough for small a,b which is our use case.
 */
function betaSample(a: number, b: number): number {
  // Use inverse-transform with gamma via rejection for general a,b
  // Simple Box-Muller-ish approach for a,b >= 1
  // For simplicity, use the standard-uniform approach:
  const u = gammaSample(a);
  const v = gammaSample(b);
  return u / (u + v);
}

/** Marsaglia & Tsang's gamma variate (shape >= 1) */
function gammaSample(shape: number): number {
  if (shape < 1) {
    // Ahrens-Dieter for shape < 1
    return gammaSample(shape + 1) * Math.pow(Math.random(), 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number, v: number;
    do {
      x = randn();
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

/** Standard normal via Box-Muller */
function randn(): number {
  const u = Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Thompson sampling: pick the framing arm with highest sample.
 * Returns the chosen framing.
 */
export function thompsonPick(state: ThompsonState): Framing {
  let best: Framing = 'yr';
  let bestSample = -Infinity;

  for (const f of ['abs', 'rel', 'yr'] as Framing[]) {
    const arm = state.arms[f];
    const sample = betaSample(arm.a, arm.b);
    if (sample > bestSample) {
      bestSample = sample;
      best = f;
    }
  }

  return best;
}

/** Update Thompson state after observing a share (or not) */
export function thompsonUpdate(
  state: ThompsonState,
  framing: Framing,
  shared: boolean,
): void {
  if (shared) {
    state.arms[framing].a += 1;
  } else {
    state.arms[framing].b += 1;
  }
}
