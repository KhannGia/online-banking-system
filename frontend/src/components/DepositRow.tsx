import { useState } from 'react'
import { useAccount } from 'wagmi'
import { savingCoreAbi } from '../generated'
import { getAddress } from '../config/contracts'
import { deriveDepositView, type DepositRaw } from '../lib/deposit'
import { formatUsdc, bpsToPercent, formatCountdown } from '../lib/format'
import { TxButton } from './TxButton'
import { RenewDialog } from './RenewDialog'

export function DepositRow({ d, nowSecs, gracePeriod, systemPaused, onChanged }: {
  d: DepositRaw; nowSecs: number; gracePeriod: number; systemPaused: boolean; onChanged: () => void
}) {
  const { chainId } = useAccount()
  const core = chainId ? getAddress('SavingCore', chainId) : undefined
  const v = deriveDepositView(d, nowSecs, gracePeriod, systemPaused)
  const [renewing, setRenewing] = useState(false)
  const [confirmingEarly, setConfirmingEarly] = useState(false)

  const timing = v.isActive
    ? v.isMatured
      ? (v.isPastGrace ? 'past grace' : `grace ends in ${formatCountdown(v.secondsToGraceEnd)}`)
      : `matures in ${formatCountdown(v.secondsToMaturity)}`
    : '—'

  return (
    <tr className="border-t border-slate-800">
      <td className="py-2 px-3">#{d.depositId.toString()}</td>
      <td className="px-3">{formatUsdc(d.principal)} USDC</td>
      <td className="px-3">{bpsToPercent(d.aprBpsAtOpen)}</td>
      <td className="px-3">{v.statusLabel}</td>
      <td className="px-3 text-slate-400">{timing}</td>
      <td className="px-3">{v.hasPendingInterest ? `${formatUsdc(d.pendingInterest)} USDC` : '—'}</td>
      <td className="px-3">
        <div className="flex gap-2 flex-wrap justify-end">
          {v.actions.withdrawAtMaturity && (
            <TxButton key="withdraw" label="Withdraw" address={core} abi={savingCoreAbi} functionName="withdrawAtMaturity" args={[d.depositId]} onConfirmed={onChanged} />
          )}
          {v.actions.earlyWithdraw && (
            <button key="early" onClick={() => setConfirmingEarly(true)}
              className="px-3 py-1.5 rounded-md bg-amber-700 hover:bg-amber-600 text-sm">
              Early withdraw
            </button>
          )}
          {v.actions.renew && (
            <button key="renew" onClick={() => setRenewing(true)} className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-sm">Renew</button>
          )}
          {v.actions.autoRenew && (
            <TxButton key="auto" label="Auto-renew" address={core} abi={savingCoreAbi} functionName="autoRenewDeposit" args={[d.depositId]} onConfirmed={onChanged} />
          )}
          {v.actions.claimInterest && (
            <TxButton key="claim" label="Claim interest" address={core} abi={savingCoreAbi} functionName="claimInterest" args={[d.depositId]} onConfirmed={onChanged} className="px-3 py-1.5 rounded-md bg-emerald-700 hover:bg-emerald-600 text-sm" />
          )}
        </div>
        {renewing && <RenewDialog depositId={d.depositId} onClose={() => setRenewing(false)} onDone={onChanged} />}
        {confirmingEarly && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center" onClick={() => setConfirmingEarly(false)}>
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-96 space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-semibold">Early withdraw deposit #{d.depositId.toString()}</h3>
              <p className="text-xs text-slate-400">
                Withdrawing before maturity forfeits all accrued interest and charges a{' '}
                <span className="text-amber-400 font-medium">{bpsToPercent(d.penaltyBpsAtOpen)}</span>{' '}
                early-withdrawal penalty on your principal — the rate locked in when this deposit was opened. This cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <TxButton key="early-confirm" label="Confirm early withdraw" address={core} abi={savingCoreAbi} functionName="earlyWithdraw"
                  args={[d.depositId]} onConfirmed={() => { onChanged(); setConfirmingEarly(false) }}
                  className="px-3 py-1.5 rounded-md bg-amber-700 hover:bg-amber-600 text-sm" />
                <button onClick={() => setConfirmingEarly(false)} className="px-3 py-1.5 rounded-md bg-slate-700 text-sm">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </td>
    </tr>
  )
}
