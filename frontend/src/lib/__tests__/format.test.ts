import { describe, it, expect } from 'vitest'
import { formatUsdc, parseUsdc, bpsToPercent, formatCountdown } from '../format'

describe('format', () => {
  it('formats 6-decimal USDC', () => {
    expect(formatUsdc(1_000_000n)).toBe('1')
    expect(formatUsdc(1_011_095_890n)).toBe('1011.09589')
    expect(formatUsdc(0n)).toBe('0')
  })
  it('parses USDC to base units (round-trip)', () => {
    expect(parseUsdc('1')).toBe(1_000_000n)
    expect(parseUsdc('1000.5')).toBe(1_000_500_000n)
    expect(formatUsdc(parseUsdc('1234.56'))).toBe('1234.56')
  })
  it('converts bps to percent', () => {
    expect(bpsToPercent(225)).toBe('2.25%')
    expect(bpsToPercent(550n)).toBe('5.5%')
    expect(bpsToPercent(10000)).toBe('100%')
  })
  it('formats a countdown', () => {
    expect(formatCountdown(0)).toBe('0m')
    expect(formatCountdown(90)).toBe('1m')
    expect(formatCountdown(3 * 86400 + 4 * 3600 + 11 * 60)).toBe('3d 4h 11m')
  })
})
