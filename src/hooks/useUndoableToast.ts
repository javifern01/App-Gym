import { useCallback, useEffect, useRef, useState } from 'react'

export interface ToastEntry {
  id: number
  message: string
  actionLabel?: string
  onAction?: () => void
  expiresAtMs: number
}

export interface UseUndoableToastResult {
  current: ToastEntry | null
  show: (message: string, opts?: { actionLabel?: string; onAction?: () => void; durationMs?: number }) => void
  dismiss: () => void
}

/**
 * Single-slot toast with optional undo action (D-13: skip exercise → 5s undo).
 *
 * - Calling show() while a toast is active replaces it (newest wins).
 * - Calling onAction() dismisses the toast.
 * - Dismisses automatically when Date.now() >= expiresAtMs.
 */
export function useUndoableToast(): UseUndoableToastResult {
  const [current, setCurrent] = useState<ToastEntry | null>(null)
  const timeoutRef = useRef<number | null>(null)
  const idRef = useRef<number>(0)

  const dismiss = useCallback(() => {
    if (timeoutRef.current != null) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setCurrent(null)
  }, [])

  const show = useCallback(
    (
      message: string,
      opts: { actionLabel?: string; onAction?: () => void; durationMs?: number } = {}
    ) => {
      if (timeoutRef.current != null) clearTimeout(timeoutRef.current)
      const durationMs = opts.durationMs ?? 5000
      const id = ++idRef.current
      const entry: ToastEntry = {
        id,
        message,
        actionLabel: opts.actionLabel,
        onAction: opts.onAction
          ? () => {
              opts.onAction?.()
              dismiss()
            }
          : undefined,
        expiresAtMs: Date.now() + durationMs,
      }
      setCurrent(entry)
      timeoutRef.current = window.setTimeout(() => {
        setCurrent((c) => (c?.id === id ? null : c))
        timeoutRef.current = null
      }, durationMs)
    },
    [dismiss]
  )

  useEffect(() => {
    return () => {
      if (timeoutRef.current != null) clearTimeout(timeoutRef.current)
    }
  }, [])

  return { current, show, dismiss }
}
