import { describe, expect, it } from 'vitest'
import { formatTime } from './formatTime'

describe('formatTime', () => {
  it('renders 0 as 0:00', () => expect(formatTime(0)).toBe('0:00'))
  it('renders 5 as 0:05', () => expect(formatTime(5)).toBe('0:05'))
  it('renders 60 as 1:00', () => expect(formatTime(60)).toBe('1:00'))
  it('renders 90 as 1:30', () => expect(formatTime(90)).toBe('1:30'))
  it('renders 125 as 2:05', () => expect(formatTime(125)).toBe('2:05'))
  it('renders 3600 as 1:00:00', () => expect(formatTime(3600)).toBe('1:00:00'))
  it('renders 3725 as 1:02:05', () => expect(formatTime(3725)).toBe('1:02:05'))
  it('clamps negatives to 0:00', () => expect(formatTime(-5)).toBe('0:00'))
  it('clamps NaN to 0:00', () => expect(formatTime(NaN)).toBe('0:00'))
  it('clamps Infinity to 0:00', () => expect(formatTime(Infinity)).toBe('0:00'))
  it('floors fractional seconds', () => expect(formatTime(89.9)).toBe('1:29'))
})
