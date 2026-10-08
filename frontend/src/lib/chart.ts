export interface Pt {
  x: number
  y: number
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

/** Y position for a 0-100 score inside a chart of height `h` with padding `pad`. */
export function yFor(score: number, h: number, pad = 24): number {
  return pad + (h - 2 * pad) * (1 - clamp(score, 0, 100) / 100)
}

/** Evenly spaced points for a line chart. One point is centred. */
export function buildPoints(scores: number[], w: number, h: number, pad = 24): Pt[] {
  const innerW = w - 2 * pad
  return scores.map((s, i) => ({
    x: scores.length === 1 ? w / 2 : pad + (i * innerW) / (scores.length - 1),
    y: yFor(s, h, pad),
  }))
}

export function linePath(points: Pt[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
}