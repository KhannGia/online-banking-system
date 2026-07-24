import { useState } from 'react'
import { useAccount, useReadContract } from 'wagmi'
import { savingCoreAbi } from '../generated'
import { getAddress } from '../config/contracts'
import { deriveDepositView, type DepositRaw } from '../lib/deposit'
import { formatUsdc, bpsToPercent, formatCountdown } from '../lib/format'
import { TxButton } from './TxButton'
import { RenewDialog } from './RenewDialog'
import { modalOverlay, modalPanel, btnWarn, btnSecondary } from '../lib/ui'

const STATUS_STYLE: Record<string, string> = {
  Active: 'bg-emerald-900/50 text-emerald-300 ring-1 ring-emerald-700/50',
  Withdrawn: 'bg-ink-800 text-ink-500',
}

export function DepositRow({ d, nowSecs, gracePeriod, corePaused, vaultPaused, onChanged }: {
  d: DepositRaw; nowSecs: number; gracePeriod: number; corePaused: boolean; vaultPaused: boolean; onChanged: () => void
}) {
  const { chainId } = useAccount()
  const core = chainId ? getAddress('SavingCore', chainId) : undefined
  const v = deriveDepositView(d, nowSecs, gracePeriod, corePaused, vaultPaused)
  const [renewing, setRenewing] = useState(false)
  const [confirmingEarly, setConfirmingEarly] = useState(false)

  // Read the interest for THIS deposit straight from the contract (SavingCore.previewInterest)
  // instead of recomputing the formula client-side — it's the single source of truth once a
  // deposit exists on-chain. (Before a deposit is opened there's no depositId to read yet, so
  // OpenDepositDialog's pre-open estimate still uses the client-side quoteInterest formula.)
  const { data: previewedInterest } = useReadContract({
    address: core, abi: savingCoreAbi, functionName: 'previewInterest', args: [d.depositId],
    query: { enabled: v.isActive },
  })

  const timing = v.isActive
    ? v.isMatured
      ? (v.isPastGrace ? 'past grace' : `grace ends in ${formatCountdown(v.secondsToGraceEnd)}`)
      : `matures in ${formatCountdown(v.secondsToMaturity)}`
    : '—'

  return (
    <tr className="bg-ink-900 [&>td:first-child]:rounded-l-lg [&>td:last-child]:rounded-r-lg">
      <td className="py-2.5 px-3 font-mono text-ink-400">#{d.depositId.toString()}</td>
      <td className="px-3 font-mono text-ink-100">{formatUsdc(d.principal)} USDC</td>
      <td className="px-3 font-mono text-amber-400">{bpsToPercent(d.aprBpsAtOpen)}</td>
      <td className="px-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[v.statusLabel] ?? 'bg-ink-800 text-ink-400'}`}>
          {v.statusLabel}
        </span>
      </td>
      <td className="px-3 text-ink-500">{timing}</td>
      <td className="px-3 font-mono">{v.isActive && previewedInterest !== undefined ? `${formatUsdc(previewedInterest)} USDC` : '—'}</td>
      <td className="px-3 font-mono">{v.hasPendingInterest ? `${formatUsdc(d.pendingInterest)} USDC` : '—'}</td>
      <td className="px-3">
        <div className="flex gap-2 flex-wrap justify-end">
          {v.actions.withdrawAtMaturity && (
            <TxButton key="withdraw" label="Withdraw" address={core} abi={savingCoreAbi} functionName="withdrawAtMaturity" args={[d.depositId]} onConfirmed={onChanged} />
          )}
          {v.actions.earlyWithdraw && (
            <button key="early" onClick={() => setConfirmingEarly(true)} className={btnWarn}>
              Early withdraw
            </button>
          )}
          {v.actions.renew && (
            <button key="renew" onClick={() => setRenewing(true)} className={btnSecondary}>Renew</button>
          )}
          {v.actions.autoRenew && (
            <TxButton key="auto" label="Auto-renew" address={core} abi={savingCoreAbi} functionName="autoRenewDeposit" args={[d.depositId]} onConfirmed={onChanged} />
          )}
          {v.actions.claimInterest && (
            <TxButton key="claim" label="Claim interest" address={core} abi={savingCoreAbi} functionName="claimInterest" args={[d.depositId]} onConfirmed={onChanged} />
          )}
        </div>
        {renewing && <RenewDialog depositId={d.depositId} onClose={() => setRenewing(false)} onDone={onChanged} />}
        {confirmingEarly && (
          <div className={modalOverlay} onClick={() => setConfirmingEarly(false)}>
            <div className={modalPanel} onClick={(e) => e.stopPropagation()}>
              <h3 className="font-display text-lg text-ink-50">Early withdraw deposit #{d.depositId.toString()}</h3>
              <p className="text-xs text-ink-400">
                Withdrawing before maturity forfeits all accrued interest and charges a{' '}
                <span className="text-amber-400 font-medium font-mono">{bpsToPercent(d.penaltyBpsAtOpen)}</span>{' '}
                early-withdrawal penalty on your principal — the rate locked in when this deposit was opened. This cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <TxButton key="early-confirm" label="Confirm early withdraw" address={core} abi={savingCoreAbi} functionName="earlyWithdraw"
                  args={[d.depositId]} onConfirmed={() => { onChanged(); setConfirmingEarly(false) }}
                  className={btnWarn} />
                <button onClick={() => setConfirmingEarly(false)} className={btnSecondary}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </td>
    </tr>
  )
}
