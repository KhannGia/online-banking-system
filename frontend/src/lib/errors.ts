const KNOWN: { pattern: RegExp; message: string }[] = [
  { pattern: /not matured/i, message: 'Deposit has not matured yet.' },
  { pattern: /already matured/i, message: 'Deposit has already matured — use Withdraw.' },
  { pattern: /grace not passed/i, message: 'Grace period has not passed yet.' },
  { pattern: /not active/i, message: 'This deposit is no longer active.' },
  { pattern: /plan disabled/i, message: 'That plan is disabled.' },
  { pattern: /nothing pending/i, message: 'No pending interest to claim.' },
  { pattern: /not owner/i, message: 'You are not the owner of this deposit.' },
  { pattern: /below min/i, message: 'Amount is below the plan minimum.' },
  { pattern: /above max/i, message: 'Amount is above the plan maximum.' },
  { pattern: /bad apr|bad tenor|bad penalty|bad limits|bad bps/i, message: 'Invalid plan parameters.' },
  { pattern: /timelock not elapsed/i, message: 'Timelock delay has not elapsed.' },
  { pattern: /nothing scheduled/i, message: 'No scheduled withdrawal.' },
  { pattern: /OwnableUnauthorizedAccount/i, message: 'Only the contract owner can do that.' },
  { pattern: /EnforcedPause/i, message: 'The system is paused.' },
  { pattern: /ReentrancyGuardReentrantCall/i, message: 'Reentrant call blocked.' },
  { pattern: /user rejected|denied/i, message: 'You rejected the request.' },
  { pattern: /insufficient allowance|transfer amount exceeds allowance/i, message: 'Token allowance too low — approve first.' },
]

export function decodeRevert(error: unknown): string {
  const e = error as { shortMessage?: string; message?: string; details?: string } | null
  const text = [e?.shortMessage, e?.message, e?.details].filter(Boolean).join(' ')
  if (!text) return 'Transaction failed'
  for (const { pattern, message } of KNOWN) if (pattern.test(text)) return message
  return e?.shortMessage || 'Transaction failed'
}
