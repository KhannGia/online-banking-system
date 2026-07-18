import { useState } from 'react'
import { usePlans, type Plan } from '../hooks/usePlans'
import { useSystemState } from '../hooks/useSystemState'
import { bpsToPercent, formatUsdc } from '../lib/format'
import { OpenDepositDialog } from './OpenDepositDialog'

export function PlansView({ onOpened }: { onOpened: () => void }) {
  const { plans, isLoading } = usePlans()
  const { corePaused } = useSystemState()
  const [selected, setSelected] = useState<Plan | null>(null)

  if (isLoading) return <div className="text-slate-400">Loading plans…</div>
  if (plans.length === 0) return <div className="text-slate-400">No plans yet.</div>

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {plans.map((p) => (
        <div key={p.planId.toString()} className="border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-medium">Plan #{p.planId.toString()}</span>
            <span className={`text-xs px-2 py-0.5 rounded ${p.enabled ? 'bg-emerald-600/30 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>
              {p.enabled ? 'enabled' : 'disabled'}
            </span>
          </div>
          <dl className="text-sm text-slate-300 space-y-1">
            <div className="flex justify-between"><dt className="text-slate-500">Tenor</dt><dd>{p.tenorDays.toString()} days</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">APR</dt><dd>{bpsToPercent(p.aprBps)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Penalty</dt><dd>{bpsToPercent(p.earlyWithdrawPenaltyBps)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Min / Max</dt><dd>{p.minDeposit === 0n ? '—' : formatUsdc(p.minDeposit)} / {p.maxDeposit === 0n ? '—' : formatUsdc(p.maxDeposit)}</dd></div>
          </dl>
          <button disabled={!p.enabled || corePaused} onClick={() => setSelected(p)}
            className="w-full mt-2 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-sm">
            Open deposit
          </button>
        </div>
      ))}
      {selected && <OpenDepositDialog plan={selected} onClose={() => setSelected(null)} onDone={onOpened} />}
    </div>
  )
}
