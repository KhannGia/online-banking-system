import { useState } from 'react'
import { usePlans, type Plan } from '../hooks/usePlans'
import { useSystemState } from '../hooks/useSystemState'
import { useSystemStats } from '../hooks/useSystemStats'
import { bpsToPercent, formatUsdc } from '../lib/format'
import { OpenDepositDialog } from './OpenDepositDialog'
import { card, btnPrimary, label as labelClass } from '../lib/ui'

export function PlansView({ onOpened }: { onOpened: () => void }) {
  const { plans, isLoading } = usePlans()
  const { corePaused, vaultBalance } = useSystemState()
  const stats = useSystemStats()
  const [selected, setSelected] = useState<Plan | null>(null)

  if (isLoading) return <div className="text-ink-500 py-12 text-center">Loading plans…</div>
  if (plans.length === 0) return <div className="text-ink-500 py-12 text-center">No plans yet.</div>

  return (
    <div className="space-y-4">
      <div className={`${card} flex flex-wrap gap-x-8 gap-y-3`}>
        <div>
          <p className={labelClass}>Vault (interest pool)</p>
          <p className="font-mono text-amber-400 text-lg mt-0.5">{formatUsdc(vaultBalance)} USDC</p>
        </div>
        <div>
          <p className={labelClass}>Total value locked</p>
          <p className="font-mono text-ink-100 text-lg mt-0.5">
            {stats.isLoading ? '…' : `${formatUsdc(stats.activeTvl)} USDC`}
          </p>
        </div>
        <div>
          <p className={labelClass}>Active deposits</p>
          <p className="font-mono text-ink-100 text-lg mt-0.5">{stats.isLoading ? '…' : stats.activeCount}</p>
        </div>
        <div>
          <p className={labelClass}>Deposits opened (all-time)</p>
          <p className="font-mono text-ink-100 text-lg mt-0.5">{stats.isLoading ? '…' : stats.totalDepositsEverOpened}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((p) => {
          const planStat = stats.byPlan.get(p.planId.toString())
          return (
            <div key={p.planId.toString()} className={card}>
              <div className="flex justify-between items-start">
                <div>
                  <span className={labelClass}>Plan #{p.planId.toString()}</span>
                  <p className="font-display text-lg text-ink-50 mt-0.5">{p.tenorDays.toString()}-day term</p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    p.enabled ? 'bg-emerald-900/50 text-emerald-300 ring-1 ring-emerald-700/50' : 'bg-ink-800 text-ink-500'
                  }`}
                >
                  {p.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              <div className="flex items-baseline gap-1.5 pt-1">
                <span className="font-mono text-3xl font-medium text-amber-400">{bpsToPercent(p.aprBps)}</span>
                <span className="text-xs text-ink-500">APR</span>
              </div>

              <dl className="text-sm text-ink-300 space-y-1 pt-1 border-t border-ink-800">
                <div className="flex justify-between pt-2"><dt className="text-ink-500">Early penalty</dt><dd className="font-mono">{bpsToPercent(p.earlyWithdrawPenaltyBps)}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-500">Min / Max</dt>
                  <dd className="font-mono">{p.minDeposit === 0n ? '—' : formatUsdc(p.minDeposit)} / {p.maxDeposit === 0n ? '—' : formatUsdc(p.maxDeposit)}</dd>
                </div>
                <div className="flex justify-between"><dt className="text-ink-500">Active in this plan</dt>
                  <dd className="font-mono">{stats.isLoading ? '…' : `${planStat?.activeCount ?? 0} · ${formatUsdc(planStat?.activeTvl ?? 0n)} USDC`}</dd>
                </div>
              </dl>

              <button disabled={!p.enabled || corePaused} onClick={() => setSelected(p)} className={`w-full mt-1 ${btnPrimary}`}>
                Open deposit
              </button>
            </div>
          )
        })}
      </div>
      {selected && <OpenDepositDialog plan={selected} onClose={() => setSelected(null)} onDone={onOpened} />}
    </div>
  )
}
