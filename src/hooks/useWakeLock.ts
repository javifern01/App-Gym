import { useEffect, useRef, useState } from 'react'

export interface UseWakeLockResult {
  isLocked: boolean
  error: string | null
}

/**
 * Wake Lock API wrapper (RESEARCH §Pitfall 7+8, §Pattern 4).
 *
 * - Acquires a 'screen' lock when `active=true`; releases when `active=false`.
 * - Re-acquires on `visibilitychange → visible` AND `pageshow` because browsers
 *   automatically release the lock when the tab is hidden (Pitfall 7).
 * - Releases unconditionally on unmount (Pitfall 8).
 * - Silent no-op when navigator.wakeLock is unavailable (older browsers, iOS < 16.4).
 *
 * The first call to `wakeLock.request('screen')` MUST originate from a user
 * gesture (some browsers reject otherwise). The component owning the
 * "Iniciar sesión" / "Reanudar" button is responsible for ensuring `active`
 * flips to true synchronously inside the click handler.
 */
type WakeLockSentinel = { release: () => Promise<void>; addEventListener: (e: 'release', cb: () => void) => void }

export function useWakeLock(active: boolean): UseWakeLockResult {
  const sentinelRef = useRef<WakeLockSentinel | null>(null)
  const [isLocked, setIsLocked] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const acquire = async () => {
      if (typeof navigator === 'undefined') return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const wl: any = (navigator as any).wakeLock
      if (!wl || typeof wl.request !== 'function') return
      try {
        const sentinel: WakeLockSentinel = await wl.request('screen')
        if (cancelled) {
          await sentinel.release().catch(() => undefined)
          return
        }
        sentinelRef.current = sentinel
        sentinel.addEventListener('release', () => {
          setIsLocked(false)
        })
        setIsLocked(true)
        setError(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'wake lock failed')
      }
    }

    const release = async () => {
      const s = sentinelRef.current
      sentinelRef.current = null
      if (s) {
        try {
          await s.release()
        } catch {
          // ignore
        }
      }
      setIsLocked(false)
    }

    if (active) {
      acquire()
      const onVisible = () => {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible' && !sentinelRef.current && active) {
          acquire()
        }
      }
      document.addEventListener('visibilitychange', onVisible)
      window.addEventListener('pageshow', onVisible)
      return () => {
        cancelled = true
        document.removeEventListener('visibilitychange', onVisible)
        window.removeEventListener('pageshow', onVisible)
        release()
      }
    } else {
      release()
      return () => {
        cancelled = true
      }
    }
  }, [active])

  return { isLocked, error }
}
