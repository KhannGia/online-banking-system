import { useAccount } from 'wagmi'
import { useRenewableDeposits } from '../hooks/useRenewableDeposits'
import { savingCoreAbi } from '../generated'
import { getAddress } from '../config/contracts'
import { formatUsdc, bpsToPercent, shortHash } from '../lib/format'
import { TxButton } from './TxButton'
import { card, label as labelClass } from '../lib/ui'

// Surfaces deposits that ANY connected account can auto-renew — not just deposits the
// connected wallet owns. autoRenewDeposit is permissionless by design (bonus G); this is
// the UI counterpart to contract/scripts/keeper-bot.ts, so a human can do the same thing
// the reference bot does and earn the keeper reward, even while owning zero deposits.
export function RenewableDeposits({ onChanged }: { onChanged: () => void }) {
  const { chainId, isConnected } = useAccount()
  const core = chainId ? getAddress('SavingCore', chainId) : undefined
  const { deposits, isLoading, refetch } = useRenewableDeposits()

  if (!isConnected || isLoading || deposits.length === 0) return null

  return (
    <div className={card}>
      <div>
        <p className="font-display text-ink-50">Renewable by anyone</p>
        <p className="text-xs text-ink-500 mt-0.5">
          These deposits are past their grace period. Auto-renew is permissionless — you don't
          need to own a deposit to renew it, and you earn a keeper reward for doing so.
        </p>
      </div>
      <table className="w-full text-sm border-separate border-spacing-y-1">
        <thead className="text-ink-500 text-left text-xs uppercase tracking-wide">
          <tr>
            <th className="py-2 px-3 font-medium">ID</th>
            <th className="px-3 font-medium">Owner</th>
            <th className="px-3 font-medium">Principal</th>
            <th className="px-3 font-medium">APR</th>
            <th className="px-3 text-right font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {deposits.map((d) => (
            <tr key={d.depositId.toString()} className="bg-ink-900 [&>td:first-child]:rounded-l-lg [&>td:last-child]:rounded-r-lg">
              <td className="py-2.5 px-3 font-mono text-ink-400">#{d.depositId.toString()}</td>
              <td className="px-3 font-mono text-ink-400" title={d.owner}>{shortHash(d.owner)}</td>
              <td className="px-3 font-mono text-ink-100">{formatUsdc(d.principal)} USDC</td>
              <td className={`px-3 font-mono text-amber-400`}>{bpsToPercent(d.aprBpsAtOpen)}</td>
              <td className="px-3 text-right">
                <TxButton
                  label="Auto-renew"
                  address={core}
                  abi={savingCoreAbi}
                  functionName="autoRenewDeposit"
                  args={[d.depositId]}
                  onConfirmed={() => { onChanged(); refetch() }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={labelClass}>Reference bot: <span className="font-mono text-ink-400">npm run keeper:sepolia</span></p>
    </div>
  )
}
