import { describe, expect, it } from 'vitest'
import { buildPoints, linePath, yFor } from './chart'

describe('chart helpers', () => {
  it('maps 0 and 100 to the bottom and top padding', () => {
    expect(yFor(100, 200, 24)).toBe(24)
    expect(yFor(0, 200, 24)).toBe(176)
  })

  it('clamps out-of-range scores', () => {
    expect(yFor(150, 200, 24)).toBe(24)
    expect(yFor(-10, 200, 24)).toBe(176)
  })

  it('spreads points from the left to the right padding', () => {
    const pts = buildPoints([10, 50, 90], 600, 200, 24)
    expect(pts[0].x).toBe(24)
    expect(pts[2].x).toBe(576)
    expect(pts[1].x).toBe(300)
  })

  it('centres a single point', () => {
    expect(buildPoints([60], 600, 200)[0].x).toBe(300)
  })

  it('builds an SVG path, and an empty one for no data', () => {
    expect(linePath([{ x: 1, y: 2 }, { x: 3, y: 4.25 }])).toBe('M1.0 2.0 L3.0 4.3')
    expect(linePath([])).toBe('')
  })
})