import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { savingCoreAbi } from '../generated'
import { getAddress } from '../config/contracts'
import { usePlans } from '../hooks/usePlans'
import { bpsToPercent } from '../lib/format'
import { TxButton } from './TxButton'
import { modalOverlay, modalPanel, input, btnSecondary } from '../lib/ui'

export function RenewDialog({ depositId, onClose, onDone }: { depositId: bigint; onClose: () => void; onDone: () => void }) {
  const { chainId } = useAccount()
  const core = chainId ? getAddress('SavingCore', chainId) : undefined
  const { plans } = usePlans()
  const enabledPlans = plans.filter((p) => p.enabled)
  const [planId, setPlanId] = useState<bigint | null>(enabledPlans[0]?.planId ?? null)

  // usePlans() resolves asynchronously; if this dialog mounts before plan data
  // arrives, the useState initializer above captures planId = null on the first
  // render and nothing re-runs it. Sync the selection once plans (later) populate,
  // so a slow RPC doesn't leave Renew permanently disabled for the session.
  useEffect(() => {
    if (planId === null && enabledPlans.length > 0) setPlanId(enabledPlans[0].planId)
  }, [enabledPlans, planId])

  return (
    <div className={modalOverlay} onClick={onClose}>
      <div className={modalPanel} onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-lg text-ink-50">Renew deposit #{depositId.toString()}</h3>
        <p className="text-xs text-ink-400">Interest is compounded into the new principal; the new deposit uses the chosen plan's current rate.</p>
        {enabledPlans.length === 0 ? (
          <p className="text-sm text-ink-500">No enabled plans available to renew into.</p>
        ) : (
          <select className={input}
            value={planId?.toString() ?? ''} onChange={(e) => setPlanId(BigInt(e.target.value))}>
            {enabledPlans.map((p) => (
              <option key={p.planId.toString()} value={p.planId.toString()}>
                Plan #{p.planId.toString()} — {p.tenorDays.toString()}d @ {bpsToPercent(p.aprBps)}
              </option>
            ))}
          </select>
        )}
        <div className="flex gap-2 justify-end">
          <TxButton label="Renew" address={core} abi={savingCoreAbi} functionName="renewDeposit"
            args={planId !== null ? [depositId, planId] : undefined} disabled={planId === null}
            onConfirmed={() => { onDone(); onClose() }} />
          <button onClick={onClose} className={btnSecondary}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
