import { useAccount, useBlock } from 'wagmi'
import { useDeposits } from '../hooks/useDeposits'
import { useSystemState } from '../hooks/useSystemState'
import { DepositRow } from './DepositRow'

export function MyDeposits({ onChanged }: { onChanged: () => void }) {
  const { isConnected } = useAccount()
  const { deposits, isLoading, isError, error } = useDeposits()
  const { gracePeriod, corePaused, vaultPaused } = useSystemState()
  // Use the chain's latest block timestamp (not the machine's wall clock) so action
  // gating tracks block.timestamp — the clock the contract itself evaluates guards
  // against. This also tracks evm_increaseTime jumps used in local-chain demos, which
  // Date.now() would never see. Poll on an interval so a deposit crossing maturity
  // while the tab is open updates its available actions. Fall back to the wall clock
  // only until the first block arrives, so `now` is never 0.
  const { data: block } = useBlock({ watch: true, query: { refetchInterval: 5_000 } })
  const now = block ? Number(block.timestamp) : Math.floor(Date.now() / 1000)

  if (!isConnected) return <div className="text-ink-500 py-12 text-center">Connect a wallet to see your deposits.</div>
  if (isLoading) return <div className="text-ink-500 py-12 text-center">Loading your deposits…</div>
  if (isError) {
    return (
      <div className="bg-rose-950/50 border border-rose-800 text-rose-200 rounded-lg px-4 py-3 text-sm">
        Couldn't load your deposits: {error instanceof Error ? error.message : 'unknown error'}. The RPC may have
        rejected the log scan — try setting VITE_SEPOLIA_RPC to a provider with a larger eth_getLogs range.
      </div>
    )
  }
  if (deposits.length === 0) {
    return (
      <div className="text-center py-16 space-y-1">
        <p className="font-display text-lg text-ink-300">The ledger is empty.</p>
        <p className="text-ink-500 text-sm">You have no deposits yet — open one from the Deposit tab.</p>
      </div>
    )
  }

  return (
    <table className="w-full text-sm border-separate border-spacing-y-1">
      <thead className="text-ink-500 text-left text-xs uppercase tracking-wide">
        <tr>
          <th className="py-2 px-3 font-medium">ID</th><th className="px-3 font-medium">Principal</th><th className="px-3 font-medium">APR</th>
          <th className="px-3 font-medium">Status</th><th className="px-3 font-medium">Timing</th><th className="px-3 font-medium">Est. interest</th><th className="px-3 font-medium">Pending</th><th className="px-3 text-right font-medium">Actions</th>
        </tr>
      </thead>
      <tbody>
        {deposits.map((d) => (
          <DepositRow key={d.depositId.toString()} d={d} nowSecs={now}
            gracePeriod={Number(gracePeriod)} corePaused={corePaused} vaultPaused={vaultPaused} onChanged={onChanged} />
        ))}
      </tbody>
    </table>
  )
}
