/**
 * Test-mode fast-rest knob (RESEARCH §Open Q 3, §Wave 0 Gaps).
 *
 * Reads `?restMul=<number>` from window.location.search ONCE per page load.
 * Used by App.tsx (plan 02-10) to multiply `plannedSeconds * 1000` when computing
 * `restEndAt`. CRITICAL: it must NOT be applied to `rest_planned_s` — that field
 * is the prescribed value per D-14 and is the source of truth for the deviation
 * calculation in plan 02-05.
 *
 * Defaults to 1.0. Invalid values (non-numeric, non-positive, non-finite) silently
 * fall back to 1.0 — production safety: no way to break prod by typoing the param.
 */
let cached: number | null = null

export function getRestMultiplier(): number {
  if (cached !== null) return cached
  if (typeof window === 'undefined' || typeof window.location === 'undefined') {
    cached = 1
    return cached
  }
  try {
    const raw = new URLSearchParams(window.location.search).get('restMul')
    if (raw == null) {
      cached = 1
      return cached
    }
    const parsed = Number(raw)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      cached = 1
      return cached
    }
    cached = parsed
    return cached
  } catch {
    cached = 1
    return cached
  }
}

/** Test-only: invalidate the cached value so the next call re-reads. */
export function resetRestMultiplierCache(): void {
  cached = null
}
