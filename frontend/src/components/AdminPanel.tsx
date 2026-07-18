import { useState } from 'react'
import { useAccount, useReadContract, useReadContracts, useBlock } from 'wagmi'
import { savingCoreAbi, vaultManagerAbi, mockUsdcAbi } from '../generated'
import { getAddress } from '../config/contracts'
import { useSystemState } from '../hooks/useSystemState'
import { formatUsdc, parseUsdc, formatCountdown } from '../lib/format'
import { TxButton } from './TxButton'

const box = 'border border-slate-800 rounded-xl p-4 space-y-3'
const input = 'w-full bg-slate-800 rounded-md px-3 py-2 outline-none text-sm'

/**
 * parseUsdc/BigInt both throw on malformed input ('', 'abc', a bare '.', etc). This
 * panel's numeric fields are read on every keystroke, so a naive inline parse in JSX
 * would throw mid-render the moment someone clears an input or types a stray letter —
 * blanking the whole panel. Parse defensively once per render and fall back to `null`
 * so callers can gate the corresponding TxButton's `disabled` on it instead of crashing.
 */
function safeUsdc(s: string): bigint | null {
  try { return parseUsdc(s.trim() || '0') } catch { return null }
}
function safeBigInt(s: string): bigint | null {
  const t = s.trim()
  if (!/^\d+$/.test(t)) return null
  try { return BigInt(t) } catch { return null }
}

export function AdminPanel({ onChanged }: { onChanged: () => void }) {
  const { address, chainId } = useAccount()
  const core = chainId ? getAddress('SavingCore', chainId) : undefined
  const vault = chainId ? getAddress('VaultManager', chainId) : undefined
  const usdc = chainId ? getAddress('MockUSDC', chainId) : undefined
  const { vaultBalance, feeReceiver, keeperRewardBps, corePaused, vaultPaused } = useSystemState()

  // Chain's latest block timestamp, not the machine's wall clock: the timelock's
  // "executable at" check is evaluated by the contract against block.timestamp, and
  // this also tracks evm_increaseTime jumps used in local-chain demos, which
  // Date.now() would never see. Same reasoning as MyDeposits.tsx.
  const { data: block } = useBlock({ watch: true, query: { refetchInterval: 5_000 } })
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

  const fundVal = safeUsdc(fund)
  const fundInputValid = fundVal !== null && fundVal > 0n
  const needsVaultApproval = fundInputValid && (vaultAllowance ?? 0n) < (fundVal as bigint)

  const schedVal = safeUsdc(sched)
  const schedValid = schedVal !== null && schedVal > 0n

  const feeValid = fee.trim().length > 0
  const keeperVal = safeBigInt(keeper)
  const keeperValid = keeperVal !== null

  const mintAmtVal = safeUsdc(mintAmt)
  const mintValid = mintTo.trim().length > 0 && mintAmtVal !== null && mintAmtVal > 0n

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={box}>
        <h3 className="font-semibold">Create plan</h3>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-slate-400">Tenor (days)<input className={input} value={tenor} onChange={(e) => setTenor(e.target.value)} /></label>
          <label className="text-xs text-slate-400">APR (bps)<input className={input} value={apr} onChange={(e) => setApr(e.target.value)} /></label>
          <label className="text-xs text-slate-400">Min (USDC)<input className={input} value={minD} onChange={(e) => setMinD(e.target.value)} /></label>
          <label className="text-xs text-slate-400">Max (USDC)<input className={input} value={maxD} onChange={(e) => setMaxD(e.target.value)} /></label>
          <label className="text-xs text-slate-400">Penalty (bps)<input className={input} value={pen} onChange={(e) => setPen(e.target.value)} /></label>
        </div>
        <TxButton key="create-plan" label="Create plan" address={core} abi={savingCoreAbi} functionName="createPlan"
          args={planArgs} disabled={!planArgs} onConfirmed={onChanged} />
      </div>

      <div className={box}>
        <h3 className="font-semibold">Vault — balance {formatUsdc(vaultBalance)} USDC</h3>
        <div className="flex gap-2 items-center">
          <input className={input} value={fund} onChange={(e) => setFund(e.target.value)} placeholder="Fund amount (USDC)" />
          {needsVaultApproval
            ? <TxButton key="approve" label="Approve" address={usdc} abi={mockUsdcAbi} functionName="approve"
                args={vault && fundVal !== null ? [vault, fundVal] : undefined} disabled={!fundInputValid}
                onConfirmed={() => refetchVaultAllowance()} />
            : <TxButton key="fund" label="Fund" address={vault} abi={vaultManagerAbi} functionName="fundVault"
                args={fundVal !== null ? [fundVal] : undefined} disabled={!fundInputValid} onConfirmed={onChanged} />}
        </div>
        <h4 className="text-sm text-slate-400 pt-2">Timelocked withdrawal (2-day delay)</h4>
        <p className="text-xs text-slate-400">
          {hasScheduledWithdrawal
            ? <>Pending: {formatUsdc(pendingWithdraw)} USDC · {isExecutable ? 'executable now' : `executable in ${formatCountdown(secondsToExecutable)}`}</>
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
            disabled={!hasScheduledWithdrawal} onConfirmed={onChanged} className="px-3 py-1.5 rounded-md bg-slate-700 text-sm" />
        </div>
      </div>

      <div className={box}>
        <h3 className="font-semibold">Config</h3>
        <p className="text-xs text-slate-400">Fee receiver: {feeReceiver ?? '—'} · keeper reward: {keeperRewardBps.toString()} bps</p>
        <div className="flex gap-2"><input className={input} value={fee} onChange={(e) => setFee(e.target.value)} placeholder="New fee receiver (0x…)" />
          <TxButton key="set-fee" label="Set fee" address={vault} abi={vaultManagerAbi} functionName="setFeeReceiver"
            args={feeValid ? [fee as `0x${string}`] : undefined} disabled={!feeValid} onConfirmed={onChanged} /></div>
        <div className="flex gap-2"><input className={input} value={keeper} onChange={(e) => setKeeper(e.target.value)} placeholder="Keeper reward (bps)" />
          <TxButton key="set-keeper" label="Set keeper" address={core} abi={savingCoreAbi} functionName="setKeeperRewardBps"
            args={keeperVal !== null ? [keeperVal] : undefined} disabled={!keeperValid} onConfirmed={onChanged} /></div>
      </div>

      <div className={box}>
        <h3 className="font-semibold">Emergency & demo</h3>
        <div className="flex gap-2">
          <TxButton key="pause-core" label={corePaused ? 'Unpause SavingCore' : 'Pause SavingCore'} address={core} abi={savingCoreAbi}
            functionName={corePaused ? 'unpause' : 'pause'} onConfirmed={onChanged}
            className="px-3 py-1.5 rounded-md bg-rose-700 hover:bg-rose-600 text-sm" />
          <TxButton key="pause-vault" label={vaultPaused ? 'Unpause VaultManager' : 'Pause VaultManager'} address={vault} abi={vaultManagerAbi}
            functionName={vaultPaused ? 'unpause' : 'pause'} onConfirmed={onChanged}
            className="px-3 py-1.5 rounded-md bg-rose-700 hover:bg-rose-600 text-sm" />
        </div>
        <h4 className="text-sm text-slate-400 pt-2">Mint MockUSDC (demo)</h4>
        <div className="grid grid-cols-2 gap-2">
          <input className={input} value={mintTo} onChange={(e) => setMintTo(e.target.value)} placeholder="To (0x…)" />
          <input className={input} value={mintAmt} onChange={(e) => setMintAmt(e.target.value)} placeholder="Amount (USDC)" />
        </div>
        <TxButton key="mint" label="Mint" address={usdc} abi={mockUsdcAbi} functionName="mint"
          args={mintTo.trim().length > 0 && mintAmtVal !== null ? [mintTo as `0x${string}`, mintAmtVal] : undefined}
          disabled={!mintValid} onConfirmed={onChanged} />
      </div>
    </div>
  )
}
