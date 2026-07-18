import { describe, it, expect } from 'vitest'
import { deriveDepositView, DepositStatus, type DepositRaw } from '../deposit'

const GRACE = 3 * 86400
const base: DepositRaw = {
  depositId: 0n, planId: 0n, principal: 1_000_000_000n, startAt: 0n,
  maturityAt: BigInt(180 * 86400), aprBpsAtOpen: 225n, penaltyBpsAtOpen: 550n,
  tenorDaysAtOpen: 180n, status: DepositStatus.Active, pendingInterest: 0n,
}
const maturity = 180 * 86400

describe('deriveDepositView', () => {
  it('before maturity: only earlyWithdraw', () => {
    const v = deriveDepositView(base, maturity - 10, GRACE, false)
    expect(v.actions).toMatchObject({ earlyWithdraw: true, withdrawAtMaturity: false, renew: false, autoRenew: false })
    expect(v.isMatured).toBe(false)
  })
  it('exactly at maturity: withdraw + renew, not early, not autoRenew', () => {
    const v = deriveDepositView(base, maturity, GRACE, false)
    expect(v.actions).toMatchObject({ withdrawAtMaturity: true, renew: true, earlyWithdraw: false, autoRenew: false })
    expect(v.isMatured).toBe(true)
  })
  it('exactly at grace end: autoRenew becomes available', () => {
    expect(deriveDepositView(base, maturity + GRACE - 1, GRACE, false).actions.autoRenew).toBe(false)
    expect(deriveDepositView(base, maturity + GRACE, GRACE, false).actions.autoRenew).toBe(true)
  })
  it('paused: all lifecycle actions off', () => {
    const v = deriveDepositView(base, maturity + GRACE, GRACE, true)
    expect(v.actions).toMatchObject({ withdrawAtMaturity: false, earlyWithdraw: false, renew: false, autoRenew: false, claimInterest: false })
  })
  it('paused: claimInterest is off even with pending interest', () => {
    const withPending: DepositRaw = { ...base, pendingInterest: 500n }
    const v = deriveDepositView(withPending, maturity + GRACE, GRACE, true)
    expect(v.actions.claimInterest).toBe(false)
  })
  it('pendingInterest gates claim independent of status', () => {
    const withdrawn: DepositRaw = { ...base, status: DepositStatus.Withdrawn, pendingInterest: 500n }
    const v = deriveDepositView(withdrawn, maturity + 1, GRACE, false)
    expect(v.actions.claimInterest).toBe(true)
    expect(v.actions.withdrawAtMaturity).toBe(false) // not Active
    expect(v.statusLabel).toBe('Withdrawn')
  })
  it('non-active deposit offers no lifecycle actions', () => {
    const renewed: DepositRaw = { ...base, status: DepositStatus.ManualRenewed }
    const v = deriveDepositView(renewed, maturity + 1, GRACE, false)
    expect(v.actions).toMatchObject({ withdrawAtMaturity: false, renew: false, autoRenew: false, earlyWithdraw: false })
    expect(v.statusLabel).toBe('Manually renewed')
  })
})

import { quoteInterest } from '../deposit'

describe('quoteInterest', () => {
  it('matches the contract formula for both worked examples', () => {
    // 1000 USDC @ 225 bps / 180 days → 11,095,890 base units
    expect(quoteInterest(1_000_000_000n, 225n, 180n)).toBe(11_095_890n)
    // 1000 USDC @ 250 bps / 90 days → 6,164,383 base units
    expect(quoteInterest(1_000_000_000n, 250n, 90n)).toBe(6_164_383n)
  })
  it('truncates sub-unit interest to zero', () => {
    expect(quoteInterest(10n, 1n, 1n)).toBe(0n)
  })
})
