export const DepositStatus = { Active: 0, Withdrawn: 1, ManualRenewed: 2, AutoRenewed: 3 } as const
export type DepositStatus = (typeof DepositStatus)[keyof typeof DepositStatus]

export type DepositRaw = {
  depositId: bigint
  planId: bigint
  principal: bigint
  startAt: bigint
  maturityAt: bigint
  aprBpsAtOpen: bigint
  penaltyBpsAtOpen: bigint
  tenorDaysAtOpen: bigint
  status: number
  pendingInterest: bigint
}

export type DepositView = {
  statusLabel: string
  isActive: boolean
  isMatured: boolean
  isPastGrace: boolean
  secondsToMaturity: number
  secondsToGraceEnd: number
  hasPendingInterest: boolean
  actions: {
    withdrawAtMaturity: boolean
    earlyWithdraw: boolean
    renew: boolean
    autoRenew: boolean
    claimInterest: boolean
  }
}

const STATUS_LABEL: Record<number, string> = {
  [DepositStatus.Active]: 'Active',
  [DepositStatus.Withdrawn]: 'Withdrawn',
  [DepositStatus.ManualRenewed]: 'Manually renewed',
  [DepositStatus.AutoRenewed]: 'Auto-renewed',
}

// Client-side interest quote (same simple-interest formula as SavingCore._computeInterest).
// BigInt is arbitrary-precision so plain (a*b*c)/d equals the contract's Math.mulDiv here.
export function quoteInterest(principal: bigint, aprBps: bigint, tenorDays: bigint): bigint {
  const tenorSeconds = tenorDays * 86400n
  return (principal * aprBps * tenorSeconds) / (31_536_000n * 10_000n)
}

export function deriveDepositView(
  d: DepositRaw,
  nowSecs: number,
  gracePeriodSecs: number,
  systemPaused: boolean,
): DepositView {
  const maturity = Number(d.maturityAt)
  const graceEnd = maturity + gracePeriodSecs
  const isActive = d.status === DepositStatus.Active
  const isMatured = nowSecs >= maturity
  const isPastGrace = nowSecs >= graceEnd
  const hasPendingInterest = d.pendingInterest > 0n
  const live = isActive && !systemPaused

  return {
    statusLabel: STATUS_LABEL[d.status] ?? 'Unknown',
    isActive,
    isMatured,
    isPastGrace,
    secondsToMaturity: Math.max(0, maturity - nowSecs),
    secondsToGraceEnd: Math.max(0, graceEnd - nowSecs),
    hasPendingInterest,
    actions: {
      withdrawAtMaturity: live && isMatured,
      earlyWithdraw: live && !isMatured,
      renew: live && isMatured,
      autoRenew: live && isPastGrace,
      claimInterest: hasPendingInterest && !systemPaused,
    },
  }
}
