import { useAccount, useReadContract, useReadContracts } from 'wagmi'
import { savingCoreAbi } from '../generated'
import { getAddress } from '../config/contracts'

export type Plan = {
  planId: bigint
  tenorDays: bigint
  aprBps: bigint
  minDeposit: bigint
  maxDeposit: bigint
  earlyWithdrawPenaltyBps: bigint
  enabled: boolean
}

export function usePlans() {
  const { chainId } = useAccount()
  const core = chainId ? getAddress('SavingCore', chainId) : undefined

  const { data: count } = useReadContract({
    address: core, abi: savingCoreAbi, functionName: 'planCount',
    query: { enabled: !!core },
  })
  const n = count ? Number(count) : 0

  const { data, isLoading } = useReadContracts({
    query: { enabled: !!core && n > 0 },
    contracts: Array.from({ length: n }, (_, i) => ({
      address: core, abi: savingCoreAbi, functionName: 'plans', args: [BigInt(i)],
    })),
  })

  const plans: Plan[] = (data ?? []).map((r, i) => {
    const p = r.result as {
      tenorDays: bigint; aprBps: bigint; minDeposit: bigint; maxDeposit: bigint
      earlyWithdrawPenaltyBps: bigint; enabled: boolean
    }
    return { planId: BigInt(i), ...p }
  })

  return { plans, isLoading }
}
