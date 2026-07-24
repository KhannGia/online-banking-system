import { useState } from 'react'
import { useAccount, useReadContract, useReadContracts, useBlock } from 'wagmi'
import { savingCoreAbi, vaultManagerAbi, mockUsdcAbi } from '../generated'
import { getAddress } from '../config/contracts'
import { useSystemState } from '../hooks/useSystemState'
import { usePlans } from '../hooks/usePlans'
import { useUsdcBalance } from '../hooks/useUsdcBalance'
import { formatUsdc, formatCountdown, bpsToPercent, safeUsdc, safeBigInt } from '../lib/format'
import { TxButton } from './TxButton'
import { card, input, label as labelClass, btnDanger, btnSecondary } from '../lib/ui'

const sectionTitle = 'font-display text-base text-ink-50'

// UI should never offer a button whose tx would revert on a malformed address —
// gate on this instead of a bare non-empty check.
const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/
function isValidAddress(s: string): boolean {
  return EVM_ADDRESS_RE.test(s)
}

// Matches SavingCore's own "bad apr" require (aprBps > 0 && <= MAX_APR_BPS) so the
// Update button disables before the tx would revert, same pattern as the other forms here.
function parseNewAprBps(raw: string): bigint | null {
  const v = safeBigInt(raw)
  return v !== null && v > 0n && v <= 10_000n ? v : null
}

export function AdminPanel({ onChanged }: { onChanged: () => void }) {
  const { address, chainId } = useAccount()
  const core = chainId ? getAddress('SavingCore', chainId) : undefined
  const vault = chainId ? getAddress('VaultManager', chainId) : undefined
  const usdc = chainId ? getAddress('MockUSDC', chainId) : undefined
  const { vaultBalance, feeReceiver, keeperRewardBps, corePaused, vaultPaused, owner } = useSystemState()
  const { plans, isLoading: plansLoading } = usePlans()

  // Owner check lives here (not just in App/useIsOwner) so it can gate what this
  // component *renders* without ever gating whether it's *mounted*. `owner` is
  // undefined until the systemState multicall resolves — track that separately
  // from "resolved and it's someone else" so the panel can tell the two apart.
  const ownerChecked = owner !== undefined
  const isOwner = !!address && ownerChecked && address.toLowerCase() === owner.toLowerCase()

  // Chain's latest block timestamp, not the machine's wall clock: the timelock's
  // "executable at" check is evaluated by the contract against block.timestamp, and
  // this also tracks evm_increaseTime jumps used in local-chain demos, which
  // Date.now() would never see. Same reasoning as MyDeposits.tsx.
  //
  // watch:true alone keeps this fresh (it opens a live block subscription under
  // the hood); the refetchInterval a previous version added on top of it was a
  // second, redundant polling path for the same data — removed.
  const { data: block } = useBlock({ watch: true })
  const now = block ? Number(block.timestamp) : Math.floor(Date.now() / 1000)

  // createPlan form (pre-filled to personal-variant defaults)
  const [tenor, setTenor] = useState('180')
  const [apr, setApr] = useState('225')
  const [minD, setMinD] = useState('0')
  const [maxD, setMaxD] = useState('0')
  const [pen, setPen] = useState('550')
  // vault + config forms
  const [fund, setFund] = useState('100000')
  const [sched, setSched] = useState('0')
  const [fee, setFee] = useState('')
  const [keeper, setKeeper] = useState('50')
  const [mintTo, setMintTo] = useState(address ?? '')
  const [mintAmt, setMintAmt] = useState('10000')
  // updatePlan: one pending "new APR" input per plan row, keyed by planId
  const [aprEdits, setAprEdits] = useState<Record<string, string>>({})

  const { data: vaultAllowance, refetch: refetchVaultAllowance } = useReadContract({
    address: usdc, abi: mockUsdcAbi, functionName: 'allowance',
    args: address && vault ? [address, vault] : undefined, query: { enabled: !!usdc && !!address && !!vault },
  })

  const { data: timelock } = useReadContracts({
    query: { enabled: !!vault },
    contracts: [
      { address: vault, abi: vaultManagerAbi, functionName: 'pendingWithdrawAmount' },
      { address: vault, abi: vaultManagerAbi, functionName: 'withdrawExecutableAt' },
    ],
  })
  const pendingWithdraw = (timelock?.[0]?.result as bigint | undefined) ?? 0n
  const executableAt = Number((timelock?.[1]?.result as bigint | undefined) ?? 0n)
  const secondsToExecutable = executableAt - now
  const hasScheduledWithdrawal = pendingWithdraw > 0n
  const isExecutable = hasScheduledWithdrawal && executableAt > 0 && secondsToExecutable <= 0

  // createPlan: tenor/apr/penalty are plain integers (BigInt); min/max are USDC amounts
  // (parseUsdc, 6 decimals). All must parse for the button to be usable.
  const tenorVal = safeBigInt(tenor)
  const aprVal = safeBigInt(apr)
  const minVal = safeUsdc(minD)
  const maxVal = safeUsdc(maxD)
  const penVal = safeBigInt(pen)
  const planArgs =
    tenorVal !== null && aprVal !== null && minVal !== null && maxVal !== null && penVal !== null
      ? ([tenorVal, aprVal, minVal, maxVal, penVal] as const)
      : undefined

  const ownerUsdcBalance = useUsdcBalance()
  const fundVal = safeUsdc(fund)
  const fundInputValid = fundVal !== null && fundVal > 0n
  const needsVaultApproval = fundInputValid && (vaultAllowance ?? 0n) < (fundVal as bigint)
  // Insufficient balance still lets safeTransferFrom's revert through, but MetaMask's
  // gas estimation for a call that's guaranteed to revert can itself get rejected by the
  // RPC ("gas limit too high") before the real reason ever reaches the user — catch it
  // here instead of letting that confusing message be the first sign of a bad input.
  const insufficientFundBalance = fundInputValid && (ownerUsdcBalance ?? 0n) < (fundVal as bigint)

  const schedVal = safeUsdc(sched)
  const schedValid = schedVal !== null && schedVal > 0n

  const feeValid = isValidAddress(fee)
  const keeperVal = safeBigInt(keeper)
  const keeperValid = keeperVal !== null

  const mintAmtVal = safeUsdc(mintAmt)
  const mintValid = isValidAddress(mintTo) && mintAmtVal !== null && mintAmtVal > 0n

  // All hooks above run unconditionally on every render — this early return only
  // changes what's rendered, never whether the component (and its form state) is
  // mounted. A non-owner still never sees a usable panel: just this notice.
  if (!isOwner) {
    return (
      <div className={card}>
        <p className="text-sm text-ink-400">
          {ownerChecked ? 'Not authorized — connect the contract owner account to manage admin settings.' : 'Checking admin access…'}
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={card}>
        <h3 className={sectionTitle}>Create plan</h3>
        <div className="grid grid-cols-2 gap-2">
          <label className={labelClass}>Tenor (days)<input className={`${input} mt-1`} value={tenor} onChange={(e) => setTenor(e.target.value)} /></label>
          <label className={labelClass}>APR (bps)<input className={`${input} mt-1`} value={apr} onChange={(e) => setApr(e.target.value)} /></label>
          <label className={labelClass}>Min (USDC)<input className={`${input} mt-1`} value={minD} onChange={(e) => setMinD(e.target.value)} /></label>
          <label className={labelClass}>Max (USDC)<input className={`${input} mt-1`} value={maxD} onChange={(e) => setMaxD(e.target.value)} /></label>
          <label className={labelClass}>Penalty (bps)<input className={`${input} mt-1`} value={pen} onChange={(e) => setPen(e.target.value)} /></label>
        </div>
        <TxButton key="create-plan" label="Create plan" address={core} abi={savingCoreAbi} functionName="createPlan"
          args={planArgs} disabled={!planArgs} onConfirmed={onChanged} />
      </div>

      <div className={card}>
        <h3 className={sectionTitle}>Manage plans</h3>
        {plansLoading ? (
          <p className="text-sm text-ink-400">Loading plans…</p>
        ) : plans.length === 0 ? (
          <p className="text-sm text-ink-400">No plans created yet.</p>
        ) : (
          <table className="w-full text-sm border-separate border-spacing-y-1">
            <thead className="text-ink-500 text-left text-xs uppercase tracking-wide">
              <tr>
                <th className="py-1 font-medium">ID</th><th className="font-medium">Tenor</th><th className="font-medium">APR</th>
                <th className="font-medium">Min</th><th className="font-medium">Max</th><th className="font-medium">Penalty</th>
                <th className="font-medium">Status</th><th className="font-medium">New APR</th><th className="text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.planId.toString()} className="bg-ink-850 [&>td:first-child]:rounded-l-lg [&>td:last-child]:rounded-r-lg">
                  <td className="py-1.5 font-mono text-ink-400">{p.planId.toString()}</td>
                  <td className="font-mono">{p.tenorDays.toString()}d</td>
                  <td className="font-mono text-amber-400">{bpsToPercent(p.aprBps)}</td>
                  <td className="font-mono">{p.minDeposit > 0n ? formatUsdc(p.minDeposit) : '—'}</td>
                  <td className="font-mono">{p.maxDeposit > 0n ? formatUsdc(p.maxDeposit) : '—'}</td>
                  <td className="font-mono">{bpsToPercent(p.earlyWithdrawPenaltyBps)}</td>
                  <td>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.enabled ? 'bg-emerald-900/50 text-emerald-300 ring-1 ring-emerald-700/50' : 'bg-ink-800 text-ink-500'}`}>
                      {p.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1 items-center">
                      <input className={`${input} w-16`} value={aprEdits[p.planId.toString()] ?? ''}
                        onChange={(e) => setAprEdits((s) => ({ ...s, [p.planId.toString()]: e.target.value }))} placeholder="bps" />
                      <TxButton key={`update-apr-${p.planId}`} label="Update" address={core} abi={savingCoreAbi} functionName="updatePlan"
                        args={parseNewAprBps(aprEdits[p.planId.toString()] ?? '') !== null ? [p.planId, parseNewAprBps(aprEdits[p.planId.toString()] ?? '')] : undefined}
                        disabled={parseNewAprBps(aprEdits[p.planId.toString()] ?? '') === null}
                        onConfirmed={() => { onChanged(); setAprEdits((s) => ({ ...s, [p.planId.toString()]: '' })) }}
                        className={btnSecondary} />
                    </div>
                  </td>
                  <td className="text-right">
                    {p.enabled ? (
                      <TxButton key={`disable-${p.planId}`} label="Disable" address={core} abi={savingCoreAbi}
                        functionName="disablePlan" args={[p.planId]} onConfirmed={onChanged} className={btnDanger} />
                    ) : (
                      <TxButton key={`enable-${p.planId}`} label="Enable" address={core} abi={savingCoreAbi}
                        functionName="enablePlan" args={[p.planId]} onConfirmed={onChanged} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className={card}>
        <h3 className={sectionTitle}>Vault <span className="font-mono text-amber-400">{formatUsdc(vaultBalance)} USDC</span></h3>
        <p className="text-xs text-ink-500 font-mono">Your balance: {ownerUsdcBalance !== undefined ? formatUsdc(ownerUsdcBalance) : '—'} USDC</p>
        <div className="flex gap-2 items-center">
          <input className={input} value={fund} onChange={(e) => setFund(e.target.value)} placeholder="Fund amount (USDC)" />
          {needsVaultApproval
            ? <TxButton key="approve" label="Approve" address={usdc} abi={mockUsdcAbi} functionName="approve"
                args={vault && fundVal !== null ? [vault, fundVal] : undefined} disabled={!fundInputValid}
                onConfirmed={() => refetchVaultAllowance()} />
            : <TxButton key="fund" label="Fund" address={vault} abi={vaultManagerAbi} functionName="fundVault"
                args={fundVal !== null ? [fundVal] : undefined} disabled={!fundInputValid || insufficientFundBalance} onConfirmed={onChanged} />}
        </div>
        {insufficientFundBalance && (
          <p className="text-xs text-rose-400">Your balance is below the fund amount — mint more MockUSDC below first.</p>
        )}
        <h4 className="text-sm text-ink-300 pt-2 font-medium">Timelocked withdrawal (2-day delay)</h4>
        <p className="text-xs text-ink-400">
          {hasScheduledWithdrawal
            ? <>Pending: <span className="font-mono">{formatUsdc(pendingWithdraw)} USDC</span> · {isExecutable ? 'executable now' : `executable in ${formatCountdown(secondsToExecutable)}`}</>
            : 'No withdrawal scheduled.'}
        </p>
        <div className="flex gap-2 items-center">
          <input className={input} value={sched} onChange={(e) => setSched(e.target.value)} placeholder="Amount (USDC)" />
          <TxButton key="schedule" label="Schedule" address={vault} abi={vaultManagerAbi} functionName="scheduleWithdrawVault"
            args={schedVal !== null ? [schedVal] : undefined} disabled={!schedValid} onConfirmed={onChanged} />
        </div>
        <div className="flex gap-2">
          <TxButton key="execute" label="Execute" address={vault} abi={vaultManagerAbi} functionName="executeWithdrawVault"
            disabled={!isExecutable} onConfirmed={onChanged} />
          <TxButton key="cancel" label="Cancel" address={vault} abi={vaultManagerAbi} functionName="cancelScheduledWithdrawal"
            disabled={!hasScheduledWithdrawal} onConfirmed={onChanged} className={btnSecondary} />
        </div>
      </div>

      <div className={card}>
        <h3 className={sectionTitle}>Config</h3>
        <p className="text-xs text-ink-400 font-mono">Fee receiver: {feeReceiver ?? '—'} · keeper reward: {keeperRewardBps.toString()} bps</p>
        <div className="flex gap-2"><input className={input} value={fee} onChange={(e) => setFee(e.target.value)} placeholder="New fee receiver (0x…)" />
          <TxButton key="set-fee" label="Set fee" address={vault} abi={vaultManagerAbi} functionName="setFeeReceiver"
            args={feeValid ? [fee as `0x${string}`] : undefined} disabled={!feeValid} onConfirmed={onChanged} /></div>
        <div className="flex gap-2"><input className={input} value={keeper} onChange={(e) => setKeeper(e.target.value)} placeholder="Keeper reward (bps)" />
          <TxButton key="set-keeper" label="Set keeper" address={core} abi={savingCoreAbi} functionName="setKeeperRewardBps"
            args={keeperVal !== null ? [keeperVal] : undefined} disabled={!keeperValid} onConfirmed={onChanged} /></div>
      </div>

      <div className={card}>
        <h3 className={sectionTitle}>Emergency & demo</h3>
        <div className="flex gap-2">
          <TxButton key="pause-core" label={corePaused ? 'Unpause SavingCore' : 'Pause SavingCore'} address={core} abi={savingCoreAbi}
            functionName={corePaused ? 'unpause' : 'pause'} onConfirmed={onChanged} className={btnDanger} />
          <TxButton key="pause-vault" label={vaultPaused ? 'Unpause VaultManager' : 'Pause VaultManager'} address={vault} abi={vaultManagerAbi}
            functionName={vaultPaused ? 'unpause' : 'pause'} onConfirmed={onChanged} className={btnDanger} />
        </div>
        <h4 className="text-sm text-ink-300 pt-2 font-medium">Mint MockUSDC (demo)</h4>
        <div className="grid grid-cols-2 gap-2">
          <input className={input} value={mintTo} onChange={(e) => setMintTo(e.target.value)} placeholder="To (0x…)" />
          <input className={input} value={mintAmt} onChange={(e) => setMintAmt(e.target.value)} placeholder="Amount (USDC)" />
        </div>
        <TxButton key="mint" label="Mint" address={usdc} abi={mockUsdcAbi} functionName="mint"
          args={mintValid ? [mintTo as `0x${string}`, mintAmtVal] : undefined}
          disabled={!mintValid} onConfirmed={onChanged} />
      </div>
    </div>
  )
}
