import { useAccount, useBlock, useReadContract, useReadContracts } from 'wagmi'
import { savingCoreAbi } from '../generated'
import { getAddress } from '../config/contracts'
import { decodeDeposit, DepositStatus, type DepositRaw } from '../lib/deposit'

export type RenewableDeposit = DepositRaw & { owner: `0x${string}` }

// autoRenewDeposit is permissionless (bonus G) — anyone can call it on anyone's deposit
// once it's past maturity + GRACE_PERIOD, earning keeperRewardBps of the interest. But
// useDeposits() only ever surfaces the connected wallet's OWN deposits, so an account that
// owns nothing has no row to click "Auto-renew" on. This hook lists every deposit,
// system-wide, that is Active and already past grace, regardless of owner — the same
// by-id multicall approach as useSystemStats.ts (no event-log scanning, so it doesn't hit
// the eth_getLogs range limits documented in useDeposits.ts).
export function useRenewableDeposits() {
  const { chainId } = useAccount()
  const core = chainId ? getAddress('SavingCore', chainId) : undefined

  const { data: nextId } = useReadContract({
    address: core, abi: savingCoreAbi, functionName: 'nextDepositId',
    query: { enabled: !!core },
  })
  const { data: gracePeriodRaw } = useReadContract({
    address: core, abi: savingCoreAbi, functionName: 'GRACE_PERIOD',
    query: { enabled: !!core },
  })
  const n = nextId ? Number(nextId) : 0
  const gracePeriod = gracePeriodRaw ? Number(gracePeriodRaw) : 259_200

  // Same watched-block pattern as MyDeposits.tsx: gate eligibility on the chain's own
  // timestamp, not the machine's wall clock, so evm_increaseTime demo jumps are picked up.
  const { data: block } = useBlock({ watch: true, query: { refetchInterval: 5_000 } })
  const now = block ? Number(block.timestamp) : Math.floor(Date.now() / 1000)

  const { data, isLoading, refetch } = useReadContracts({
    query: { enabled: !!core && n > 0 },
    contracts: Array.from({ length: n }, (_, i) => [
      { address: core, abi: savingCoreAbi, functionName: 'ownerOf', args: [BigInt(i)] } as const,
      { address: core, abi: savingCoreAbi, functionName: 'deposits', args: [BigInt(i)] } as const,
    ]).flat(),
  })

  const deposits: RenewableDeposit[] = []
  for (let i = 0; i < n; i++) {
    const owner = data?.[i * 2]?.result as `0x${string}` | undefined
    const t = data?.[i * 2 + 1]?.result as Parameters<typeof decodeDeposit>[0] | undefined
    if (!owner || !t) continue
    const d = decodeDeposit(t, BigInt(i))
    if (d.status !== DepositStatus.Active) continue
    if (now < Number(d.maturityAt) + gracePeriod) continue
    deposits.push({ ...d, owner })
  }

  return { deposits, isLoading, refetch: () => refetch() }
}
