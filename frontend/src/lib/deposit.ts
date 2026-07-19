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

// `SavingCore.deposits(id)` is an auto-generated public-mapping getter with NINE
// separate ABI outputs, so viem decodes it as a positional tuple/array, not a named
// object. Map by index here, once, so the mapping is pinned by a test rather than
// re-derived (and easy to silently mis-map) at every call site.
export function decodeDeposit(
  tuple: readonly [bigint, bigint, bigint, bigint, bigint, bigint, bigint, number, bigint],
  depositId: bigint,
): DepositRaw {
  return {
    depositId,
    planId: tuple[0],
    principal: tuple[1],
    startAt: tuple[2],
    maturityAt: tuple[3],
    aprBpsAtOpen: tuple[4],
    penaltyBpsAtOpen: tuple[5],
    tenorDaysAtOpen: tuple[6],
    status: Number(tuple[7]),
    pendingInterest: tuple[8],
  }
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
  corePaused: boolean,
  vaultPaused: boolean,
): DepositView {
  const maturity = Number(d.maturityAt)
  const graceEnd = maturity + gracePeriodSecs
  const isActive = d.status === DepositStatus.Active
  const isMatured = nowSecs >= maturity
  const isPastGrace = nowSecs >= graceEnd
  const hasPendingInterest = d.pendingInterest > 0n
  // earlyWithdraw pays no interest (no vault.payInterest call), so it only needs
  // SavingCore to be unpaused. Every other lifecycle action pays interest via
  // VaultManager.payInterest, which itself carries whenNotPaused — so those also
  // need the vault to be unpaused, or the tx reverts.
  const liveCore = isActive && !corePaused
  const liveCoreAndVault = liveCore && !vaultPaused

  return {
    statusLabel: STATUS_LABEL[d.status] ?? 'Unknown',
    isActive,
    isMatured,
    isPastGrace,
    secondsToMaturity: Math.max(0, maturity - nowSecs),
    secondsToGraceEnd: Math.max(0, graceEnd - nowSecs),
    hasPendingInterest,
    actions: {
      withdrawAtMaturity: liveCoreAndVault && isMatured,
      earlyWithdraw: liveCore && !isMatured,
      renew: liveCoreAndVault && isMatured,
      autoRenew: liveCoreAndVault && isPastGrace,
      claimInterest: hasPendingInterest && !corePaused && !vaultPaused,
    },
  }
}
