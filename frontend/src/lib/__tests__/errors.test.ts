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
