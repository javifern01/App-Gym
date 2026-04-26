import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { getRestMultiplier, resetRestMultiplierCache } from './restMultiplier'

describe('getRestMultiplier', () => {
  const originalLocation = window.location

  beforeEach(() => {
    resetRestMultiplierCache()
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    })
    resetRestMultiplierCache()
  })

  function setSearch(search: string) {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, search },
    })
  }

  it('returns 1 when no restMul param is present', () => {
    setSearch('')
    expect(getRestMultiplier()).toBe(1)
  })

  it('returns parsed value when restMul=0.05', () => {
    setSearch('?restMul=0.05')
    expect(getRestMultiplier()).toBe(0.05)
  })

  it('returns 1 when restMul is non-numeric', () => {
    setSearch('?restMul=foo')
    expect(getRestMultiplier()).toBe(1)
  })

  it('returns 1 when restMul is negative', () => {
    setSearch('?restMul=-1')
    expect(getRestMultiplier()).toBe(1)
  })

  it('returns 1 when restMul is zero (rejected to avoid instant REST_DONE)', () => {
    setSearch('?restMul=0')
    expect(getRestMultiplier()).toBe(1)
  })

  it('caches the value across calls (idempotent)', () => {
    setSearch('?restMul=0.5')
    expect(getRestMultiplier()).toBe(0.5)
    setSearch('?restMul=0.1')
    expect(getRestMultiplier()).toBe(0.5)
    resetRestMultiplierCache()
    expect(getRestMultiplier()).toBe(0.1)
  })
})
