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
