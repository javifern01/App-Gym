import { useCallback, useEffect, useRef, useState } from 'react'

export interface UseAudioCueResult {
  /**
   * MUST be called from inside an actual user gesture handler (e.g. onClick of
   * "Iniciar sesión", "Reanudar", or "✓ Hecho"). Calling from a useEffect on
   * mount fails on iOS Safari (RESEARCH §Pitfall 1).
   */
  prime: () => Promise<void>
  /** Plays a short beep. No-op if AudioContext is unavailable or not primed. */
  beep: (frequencyHz?: number, durationMs?: number) => void
  isPrimed: boolean
}

/**
 * Web Audio cue (RESEARCH §Pattern 3 + §Pitfall 1).
 * Single shared AudioContext per page; lazily created in prime().
 */
export function useAudioCue(): UseAudioCueResult {
  const ctxRef = useRef<AudioContext | null>(null)
  const [isPrimed, setIsPrimed] = useState(false)

  useEffect(() => {
    return () => {
      ctxRef.current?.close().catch(() => undefined)
      ctxRef.current = null
    }
  }, [])

  const prime = useCallback(async () => {
    if (typeof window === 'undefined') return
    const Ctor: typeof AudioContext | undefined =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).AudioContext ?? (window as any).webkitAudioContext
    if (!Ctor) return
    if (!ctxRef.current) {
      ctxRef.current = new Ctor()
    }
    if (ctxRef.current.state === 'suspended') {
      try {
        await ctxRef.current.resume()
      } catch {
        // ignore — primer just failed; UI still works without sound
      }
    }
    setIsPrimed(ctxRef.current.state === 'running')
  }, [])

  const beep = useCallback((frequencyHz: number = 880, durationMs: number = 200) => {
    const ctx = ctxRef.current
    if (!ctx || ctx.state !== 'running') return
    const t0 = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = frequencyHz
    gain.gain.setValueAtTime(0.0001, t0)
    gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durationMs / 1000)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t0)
    osc.stop(t0 + durationMs / 1000 + 0.05)
  }, [])

  return { prime, beep, isPrimed }
}
