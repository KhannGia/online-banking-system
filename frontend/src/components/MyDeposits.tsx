import { useAccount } from 'wagmi'
import { useDeposits } from '../hooks/useDeposits'
import { useSystemState } from '../hooks/useSystemState'
import { DepositRow } from './DepositRow'

export function MyDeposits({ onChanged }: { onChanged: () => void }) {
  const { isConnected } = useAccount()
  const { deposits, isLoading } = useDeposits()
  const { gracePeriod, corePaused } = useSystemState()
  const now = Math.floor(Date.now() / 1000)

  if (!isConnected) return <div className="text-slate-400">Connect a wallet to see your deposits.</div>
  if (isLoading) return <div className="text-slate-400">Loading your deposits…</div>
  if (deposits.length === 0) return <div className="text-slate-400">You have no deposits yet.</div>

  return (
    <table className="w-full text-sm">
      <thead className="text-slate-500 text-left">
        <tr>
          <th className="py-2 px-3">ID</th><th className="px-3">Principal</th><th className="px-3">APR</th>
          <th className="px-3">Status</th><th className="px-3">Timing</th><th className="px-3">Pending</th><th className="px-3 text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        {deposits.map((d) => (
          <DepositRow key={d.depositId.toString()} d={d} nowSecs={now}
            gracePeriod={Number(gracePeriod)} systemPaused={corePaused} onChanged={onChanged} />
        ))}
      </tbody>
    </table>
  )
}
