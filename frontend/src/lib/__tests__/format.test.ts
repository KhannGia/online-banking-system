import { describe, it, expect } from 'vitest'
import { formatUsdc, parseUsdc, bpsToPercent, formatCountdown, safeUsdc, safeBigInt, shortHash } from '../format'

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
  it('shortens a hash to a leading/trailing snippet', () => {
    expect(shortHash('0x63cdc3901dff3243fcb81d03cbc89390a57a04f5ed35b774bd7e3f3ad597ef19')).toBe('0x63cd…ef19')
  })
  it('formats a countdown', () => {
    expect(formatCountdown(0)).toBe('0m')
    expect(formatCountdown(90)).toBe('1m')
    expect(formatCountdown(3 * 86400 + 4 * 3600 + 11 * 60)).toBe('3d 4h 11m')
  })

  // safeUsdc/safeBigInt back every write button's `disabled` gate in AdminPanel — they
  // must never throw, no matter what an operator types mid-edit.
  describe('safeUsdc', () => {
    it('treats empty string as zero', () => {
      expect(safeUsdc('')).toBe(0n)
    })
    it('treats whitespace-only string as zero', () => {
      expect(safeUsdc('   ')).toBe(0n)
    })
    it('returns null for clearly malformed text instead of throwing', () => {
      expect(safeUsdc('abc')).toBeNull()
    })
    it('parses a valid value to 6-decimal base units', () => {
      expect(safeUsdc('1')).toBe(1_000_000n)
    })
    it('parses a valid decimal value to 6-decimal base units', () => {
      expect(safeUsdc('1234.56')).toBe(1_234_560_000n)
    })
  })

  describe('safeBigInt', () => {
    it('returns null for an empty string instead of throwing', () => {
      expect(safeBigInt('')).toBeNull()
    })
    it('returns null for a whitespace-only string instead of throwing', () => {
      expect(safeBigInt('   ')).toBeNull()
    })
    it('returns null for clearly malformed text instead of throwing', () => {
      expect(safeBigInt('abc')).toBeNull()
    })
    it('parses a valid integer value', () => {
      expect(safeBigInt('180')).toBe(180n)
    })
    it('returns null for a decimal string instead of throwing (BigInt rejects decimals)', () => {
      expect(safeBigInt('1.5')).toBeNull()
    })
  })
})
