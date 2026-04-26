import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { computeRemainingMs } from './useRestTimer'

// NOTE: @testing-library/react is not installed (D-22: no new deps).
// React-mounted hook tests are skipped; only the pure-math helper is covered here.
// The mounted hook is validated at the integration layer (plan 02-11).

describe('computeRemainingMs (pure helper)', () => {
  it('returns 0 when isActive=false', () =>
    expect(computeRemainingMs(1000, 500, false)).toBe(0))

  it('returns 0 when endAt=null', () =>
    expect(computeRemainingMs(null, 500, true)).toBe(0))

  it('returns clamped delta', () =>
    expect(computeRemainingMs(1000, 500, true)).toBe(500))

  it('clamps to 0 when nowMs > endAt', () =>
    expect(computeRemainingMs(1000, 1500, true)).toBe(0))
})

describe('computeRemainingMs edge cases', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns exact 0 when nowMs === endAt', () =>
    expect(computeRemainingMs(1000, 1000, true)).toBe(0))

  it('returns full duration at start', () =>
    expect(computeRemainingMs(60_000, 0, true)).toBe(60_000))

  it('is drift-free: large jump in nowMs resolves correctly', () =>
    expect(computeRemainingMs(60_000, 30_000, true)).toBe(30_000))
})
