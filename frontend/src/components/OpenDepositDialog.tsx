import { useState } from 'react'
import { useAccount, useReadContract } from 'wagmi'
import { savingCoreAbi, mockUsdcAbi } from '../generated'
import { getAddress } from '../config/contracts'
import { formatUsdc, parseUsdc, bpsToPercent } from '../lib/format'
import { quoteInterest } from '../lib/deposit'
import { TxButton } from './TxButton'
import type { Plan } from '../hooks/usePlans'
import { useUsdcBalance } from '../hooks/useUsdcBalance'
import { modalOverlay, modalPanel, input, btnSecondary } from '../lib/ui'

export function OpenDepositDialog({ plan, onClose, onDone }: { plan: Plan; onClose: () => void; onDone: () => void }) {
  const { address, chainId } = useAccount()
  const core = chainId ? getAddress('SavingCore', chainId) : undefined
  const usdc = chainId ? getAddress('MockUSDC', chainId) : undefined
  const [amountStr, setAmountStr] = useState('1000')

  let amount = 0n
  try { amount = parseUsdc(amountStr || '0') } catch { amount = 0n }

  const balance = useUsdcBalance()
  const { data: allowance, refetch: refetchAllowance } = useReadContract({ address: usdc, abi: mockUsdcAbi, functionName: 'allowance', args: address && core ? [address, core] : undefined, query: { enabled: !!usdc && !!address && !!core } })

  const belowMin = plan.minDeposit > 0n && amount < plan.minDeposit
  const aboveMax = plan.maxDeposit > 0n && amount > plan.maxDeposit
  const needsApproval = (allowance ?? 0n) < amount
  const amountValid = amount > 0n && !belowMin && !aboveMax

  return (
    <div className={modalOverlay} onClick={onClose}>
      <div className={modalPanel} onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-lg text-ink-50">Open deposit <span className="text-ink-500 font-sans text-sm">— plan #{plan.planId.toString()}</span></h3>
        <div className="text-xs text-ink-400 font-mono">
          Balance: {balance !== undefined ? formatUsdc(balance) : '—'} USDC
          {plan.minDeposit > 0n && <> · min {formatUsdc(plan.minDeposit)}</>}
          {plan.maxDeposit > 0n && <> · max {formatUsdc(plan.maxDeposit)}</>}
        </div>
        <input value={amountStr} onChange={(e) => setAmountStr(e.target.value)} inputMode="decimal"
          className={input} placeholder="Amount (USDC)" />
        {amount > 0n && (
          <p className="text-xs text-ink-400">
            Est. interest at maturity:{' '}
            <span className="font-mono text-amber-400">{formatUsdc(quoteInterest(amount, plan.aprBps, plan.tenorDays))} USDC</span>
            {' '}(over {plan.tenorDays.toString()} days at {bpsToPercent(plan.aprBps)} APR)
          </p>
        )}
        {belowMin && <p className="text-xs text-rose-400">Below plan minimum.</p>}
        {aboveMax && <p className="text-xs text-rose-400">Above plan maximum.</p>}
        <div className="flex gap-2 justify-end pt-1">
          {needsApproval ? (
            <TxButton key="approve" label="Approve" address={usdc} abi={mockUsdcAbi} functionName="approve"
              args={core ? [core, amount] : undefined} disabled={!amountValid || !core}
              onConfirmed={() => refetchAllowance()} />
          ) : (
            <TxButton key="open" label="Open deposit" address={core} abi={savingCoreAbi} functionName="openDeposit"
              args={[plan.planId, amount]} disabled={!amountValid}
              onConfirmed={() => { onDone(); onClose() }} />
          )}
          <button onClick={onClose} className={btnSecondary}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
