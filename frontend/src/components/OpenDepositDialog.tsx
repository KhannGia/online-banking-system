import { useState } from 'react'
import { useAccount, useReadContract } from 'wagmi'
import { savingCoreAbi, mockUsdcAbi } from '../generated'
import { getAddress } from '../config/contracts'
import { formatUsdc, parseUsdc, bpsToPercent } from '../lib/format'
import { quoteInterest } from '../lib/deposit'
import { TxButton } from './TxButton'
import type { Plan } from '../hooks/usePlans'

export function OpenDepositDialog({ plan, onClose, onDone }: { plan: Plan; onClose: () => void; onDone: () => void }) {
  const { address, chainId } = useAccount()
  const core = chainId ? getAddress('SavingCore', chainId) : undefined
  const usdc = chainId ? getAddress('MockUSDC', chainId) : undefined
  const [amountStr, setAmountStr] = useState('1000')

  let amount = 0n
  try { amount = parseUsdc(amountStr || '0') } catch { amount = 0n }

  const { data: balance } = useReadContract({ address: usdc, abi: mockUsdcAbi, functionName: 'balanceOf', args: address ? [address] : undefined, query: { enabled: !!usdc && !!address } })
  const { data: allowance, refetch: refetchAllowance } = useReadContract({ address: usdc, abi: mockUsdcAbi, functionName: 'allowance', args: address && core ? [address, core] : undefined, query: { enabled: !!usdc && !!address && !!core } })

  const belowMin = plan.minDeposit > 0n && amount < plan.minDeposit
  const aboveMax = plan.maxDeposit > 0n && amount > plan.maxDeposit
  const needsApproval = (allowance ?? 0n) < amount
  const amountValid = amount > 0n && !belowMin && !aboveMax

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-96 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold">Open deposit — plan #{plan.planId.toString()}</h3>
        <div className="text-xs text-slate-400">
          Balance: {balance !== undefined ? formatUsdc(balance as bigint) : '—'} USDC
          {plan.minDeposit > 0n && <> · min {formatUsdc(plan.minDeposit)}</>}
          {plan.maxDeposit > 0n && <> · max {formatUsdc(plan.maxDeposit)}</>}
        </div>
        <input value={amountStr} onChange={(e) => setAmountStr(e.target.value)} inputMode="decimal"
          className="w-full bg-slate-800 rounded-md px-3 py-2 outline-none" placeholder="Amount (USDC)" />
        {amount > 0n && (
          <p className="text-xs text-slate-400">
            Est. interest at maturity: {formatUsdc(quoteInterest(amount, plan.aprBps, plan.tenorDays))} USDC
            {' '}(over {plan.tenorDays.toString()} days at {bpsToPercent(plan.aprBps)} APR)
          </p>
        )}
        {belowMin && <p className="text-xs text-red-400">Below plan minimum.</p>}
        {aboveMax && <p className="text-xs text-red-400">Above plan maximum.</p>}
        <div className="flex gap-2 justify-end">
          {needsApproval ? (
            <TxButton key="approve" label="Approve" address={usdc} abi={mockUsdcAbi} functionName="approve"
              args={core ? [core, amount] : undefined} disabled={!amountValid || !core}
              onConfirmed={() => refetchAllowance()} />
          ) : (
            <TxButton key="open" label="Open deposit" address={core} abi={savingCoreAbi} functionName="openDeposit"
              args={[plan.planId, amount]} disabled={!amountValid}
              onConfirmed={() => { onDone(); onClose() }} />
          )}
          <button onClick={onClose} className="px-3 py-1.5 rounded-md bg-slate-700 text-sm">Cancel</button>
        </div>
      </div>
    </div>
  )
}
