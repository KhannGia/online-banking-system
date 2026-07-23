import { describe, it, expect } from 'vitest'
import { decodeRevert } from '../errors'

describe('decodeRevert', () => {
  it('maps known contract revert strings to friendly text', () => {
    expect(decodeRevert(new Error('execution reverted: not matured'))).toMatch(/not.*matured/i)
    expect(decodeRevert({ shortMessage: 'plan disabled' })).toMatch(/disabled/i)
  })
  it('recognizes OZ custom errors', () => {
    expect(decodeRevert({ message: 'OwnableUnauthorizedAccount(0xabc)' })).toMatch(/owner|authoriz/i)
    expect(decodeRevert({ message: 'EnforcedPause()' })).toMatch(/pause/i)
  })
  it('handles user rejection', () => {
    expect(decodeRevert({ message: 'User rejected the request' })).toMatch(/rejected/i)
  })
  it('falls back to a generic message', () => {
    expect(decodeRevert(null)).toBe('Transaction failed')
  })
})

describe('decodeRevert - full revert table coverage', () => {
  it.each<[string, string]>([
    ['execution reverted: already matured', 'Deposit has already matured — use Withdraw.'],
    ['execution reverted: grace not passed', 'Grace period has not passed yet.'],
    ['execution reverted: not active', 'This deposit is no longer active.'],
    ['execution reverted: nothing pending', 'No pending interest to claim.'],
    ['execution reverted: not owner', 'You are not the owner of this deposit.'],
    ['execution reverted: below min', 'Amount is below the plan minimum.'],
    ['execution reverted: above max', 'Amount is above the plan maximum.'],
    ['execution reverted: bad apr', 'Invalid plan parameters.'],
    ['execution reverted: bad tenor', 'Invalid plan parameters.'],
    ['execution reverted: bad penalty', 'Invalid plan parameters.'],
    ['execution reverted: bad limits', 'Invalid plan parameters.'],
    ['execution reverted: bad bps', 'Invalid plan parameters.'],
    ['execution reverted: timelock not elapsed', 'Timelock delay has not elapsed.'],
    ['execution reverted: nothing scheduled', 'No scheduled withdrawal.'],
    ['ReentrancyGuardReentrantCall()', 'Reentrant call blocked.'],
    ['User denied transaction signature', 'You rejected the request.'],
    ['execution reverted: insufficient allowance', 'Token allowance too low — approve first.'],
    ['execution reverted: transfer amount exceeds allowance', 'Token allowance too low — approve first.'],
    ['execution reverted: transfer amount exceeds balance', 'Token balance too low for this amount.'],
    ['ERC20InsufficientBalance(0xabc, 0, 100)', 'Token balance too low for this amount.'],
    [
      'RPC 0xaa36a7 Infura eth_sendRawTransaction: gas limit too high',
      "Transaction rejected before execution — this usually means it would have failed (e.g. insufficient balance/allowance). Check your inputs and try again.",
    ],
  ])('maps %j to the exact message %j', (input, expected) => {
    expect(decodeRevert(new Error(input))).toBe(expected)
  })

  it('falls back to shortMessage when the error text matches no known pattern', () => {
    expect(
      decodeRevert({ shortMessage: 'Wallet error XYZ', message: 'unrelated internal detail zzz' })
    ).toBe('Wallet error XYZ')
  })
})
