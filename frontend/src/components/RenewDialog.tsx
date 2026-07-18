import { useState } from 'react'
import { useAccount } from 'wagmi'
import { savingCoreAbi } from '../generated'
import { getAddress } from '../config/contracts'
import { usePlans } from '../hooks/usePlans'
import { bpsToPercent } from '../lib/format'
import { TxButton } from './TxButton'

export function RenewDialog({ depositId, onClose, onDone }: { depositId: bigint; onClose: () => void; onDone: () => void }) {
  const { chainId } = useAccount()
  const core = chainId ? getAddress('SavingCore', chainId) : undefined
  const { plans } = usePlans()
  const enabledPlans = plans.filter((p) => p.enabled)
  const [planId, setPlanId] = useState<bigint | null>(enabledPlans[0]?.planId ?? null)

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-96 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold">Renew deposit #{depositId.toString()}</h3>
        <p className="text-xs text-slate-400">Interest is compounded into the new principal; the new deposit uses the chosen plan's current rate.</p>
        <select className="w-full bg-slate-800 rounded-md px-3 py-2"
          value={planId?.toString() ?? ''} onChange={(e) => setPlanId(BigInt(e.target.value))}>
          {enabledPlans.map((p) => (
            <option key={p.planId.toString()} value={p.planId.toString()}>
              Plan #{p.planId.toString()} — {p.tenorDays.toString()}d @ {bpsToPercent(p.aprBps)}
            </option>
          ))}
        </select>
        <div className="flex gap-2 justify-end">
          <TxButton label="Renew" address={core} abi={savingCoreAbi} functionName="renewDeposit"
            args={planId !== null ? [depositId, planId] : undefined} disabled={planId === null}
            onConfirmed={() => { onDone(); onClose() }} />
          <button onClick={onClose} className="px-3 py-1.5 rounded-md bg-slate-700 text-sm">Cancel</button>
        </div>
      </div>
    </div>
  )
}
