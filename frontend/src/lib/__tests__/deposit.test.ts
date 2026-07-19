import { describe, it, expect } from 'vitest'
import { deriveDepositView, decodeDeposit, DepositStatus, type DepositRaw } from '../deposit'

const GRACE = 3 * 86400
const base: DepositRaw = {
  depositId: 0n, planId: 0n, principal: 1_000_000_000n, startAt: 0n,
  maturityAt: BigInt(180 * 86400), aprBpsAtOpen: 225n, penaltyBpsAtOpen: 550n,
  tenorDaysAtOpen: 180n, status: DepositStatus.Active, pendingInterest: 0n,
}
const maturity = 180 * 86400

describe('deriveDepositView', () => {
  it('before maturity: only earlyWithdraw', () => {
    const v = deriveDepositView(base, maturity - 10, GRACE, false, false)
    expect(v.actions).toMatchObject({ earlyWithdraw: true, withdrawAtMaturity: false, renew: false, autoRenew: false })
    expect(v.isMatured).toBe(false)
  })
  it('exactly at maturity: withdraw + renew, not early, not autoRenew', () => {
    const v = deriveDepositView(base, maturity, GRACE, false, false)
    expect(v.actions).toMatchObject({ withdrawAtMaturity: true, renew: true, earlyWithdraw: false, autoRenew: false })
    expect(v.isMatured).toBe(true)
  })
  it('exactly at grace end: autoRenew becomes available', () => {
    expect(deriveDepositView(base, maturity + GRACE - 1, GRACE, false, false).actions.autoRenew).toBe(false)
    expect(deriveDepositView(base, maturity + GRACE, GRACE, false, false).actions.autoRenew).toBe(true)
  })
  it('both paused: all lifecycle actions off', () => {
    const v = deriveDepositView(base, maturity + GRACE, GRACE, true, true)
    expect(v.actions).toMatchObject({ withdrawAtMaturity: false, earlyWithdraw: false, renew: false, autoRenew: false, claimInterest: false })
  })
  it('both paused: claimInterest is off even with pending interest', () => {
    const withPending: DepositRaw = { ...base, pendingInterest: 500n }
    const v = deriveDepositView(withPending, maturity + GRACE, GRACE, true, true)
    expect(v.actions.claimInterest).toBe(false)
  })
  it('pendingInterest gates claim independent of status', () => {
    const withdrawn: DepositRaw = { ...base, status: DepositStatus.Withdrawn, pendingInterest: 500n }
    const v = deriveDepositView(withdrawn, maturity + 1, GRACE, false, false)
    expect(v.actions.claimInterest).toBe(true)
    expect(v.actions.withdrawAtMaturity).toBe(false) // not Active
    expect(v.statusLabel).toBe('Withdrawn')
  })
  it('non-active deposit offers no lifecycle actions', () => {
    const renewed: DepositRaw = { ...base, status: DepositStatus.ManualRenewed }
    const v = deriveDepositView(renewed, maturity + 1, GRACE, false, false)
    expect(v.actions).toMatchObject({ withdrawAtMaturity: false, renew: false, autoRenew: false, earlyWithdraw: false })
    expect(v.statusLabel).toBe('Manually renewed')
  })

  describe('independent pause switches', () => {
    it('vault paused only, pre-maturity: earlyWithdraw still available (pays no interest)', () => {
      const v = deriveDepositView(base, maturity - 10, GRACE, false, true)
      expect(v.actions.earlyWithdraw).toBe(true)
    })
    it('vault paused only, past grace: withdrawAtMaturity/renew/autoRenew all off (all call vault.payInterest, which is whenNotPaused)', () => {
      const v = deriveDepositView(base, maturity + GRACE, GRACE, false, true)
      expect(v.actions).toMatchObject({ withdrawAtMaturity: false, renew: false, autoRenew: false })
      // earlyWithdraw is unavailable here for an unrelated reason (already matured), not because of vaultPaused.
      expect(v.actions.earlyWithdraw).toBe(false)
    })
    it('vault paused only: claimInterest off when interest is pending', () => {
      const withPending: DepositRaw = { ...base, pendingInterest: 500n }
      const v = deriveDepositView(withPending, maturity + GRACE, GRACE, false, true)
      expect(v.actions.claimInterest).toBe(false)
    })
    it('core paused only: every action off, including earlyWithdraw', () => {
      const withPending: DepositRaw = { ...base, pendingInterest: 500n }
      const preMaturity = deriveDepositView(withPending, maturity - 10, GRACE, true, false)
      expect(preMaturity.actions).toMatchObject({ earlyWithdraw: false, withdrawAtMaturity: false, renew: false, autoRenew: false, claimInterest: false })
      const pastGrace = deriveDepositView(withPending, maturity + GRACE, GRACE, true, false)
      expect(pastGrace.actions).toMatchObject({ earlyWithdraw: false, withdrawAtMaturity: false, renew: false, autoRenew: false, claimInterest: false })
    })
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

describe('decodeDeposit', () => {
  // Nine distinct values, one per field, so that transposing any two indices
  // in decodeDeposit's mapping makes at least one of these assertions fail.
  const tuple = [
    11n, // [0] planId
    22n, // [1] principal
    33n, // [2] startAt
    44n, // [3] maturityAt
    55n, // [4] aprBpsAtOpen
    66n, // [5] penaltyBpsAtOpen
    77n, // [6] tenorDaysAtOpen
    3, // [7] status (AutoRenewed)
    99n, // [8] pendingInterest
  ] as const

  it('maps each tuple index to the correct named field, positionally', () => {
    const d = decodeDeposit(tuple, 1234n)
    expect(d).toEqual({
      depositId: 1234n,
      planId: 11n,
      principal: 22n,
      startAt: 33n,
      maturityAt: 44n,
      aprBpsAtOpen: 55n,
      penaltyBpsAtOpen: 66n,
      tenorDaysAtOpen: 77n,
      status: 3,
      pendingInterest: 99n,
    })
  })

  it('coerces status to a number', () => {
    const d = decodeDeposit(tuple, 1234n)
    expect(typeof d.status).toBe('number')
  })
})
