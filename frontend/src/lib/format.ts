import { formatUnits, parseUnits } from 'viem'

const USDC_DECIMALS = 6

export function formatUsdc(value: bigint): string {
  return formatUnits(value, USDC_DECIMALS)
}

export function parseUsdc(value: string): bigint {
  return parseUnits(value, USDC_DECIMALS)
}

export function bpsToPercent(bps: bigint | number): string {
  const pct = Number(bps) / 100
  return `${Number(pct.toFixed(2))}%`
}

export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '0m'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return [d ? `${d}d` : '', h ? `${h}h` : '', `${m}m`].filter(Boolean).join(' ')
}

/**
 * parseUsdc/BigInt both throw on malformed input ('', 'abc', a bare '.', etc). Form
 * fields that re-parse on every keystroke need a version that never throws mid-render
 * — these return `null` on empty or malformed input so callers can gate a button's
 * `disabled` on the result instead of crashing the render.
 */
export function safeUsdc(s: string): bigint | null {
  try { return parseUsdc(s.trim() || '0') } catch { return null }
}

export function safeBigInt(s: string): bigint | null {
  const t = s.trim()
  if (!/^\d+$/.test(t)) return null
  try { return BigInt(t) } catch { return null }
}

export function shortHash(hash: string): string {
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`
}
