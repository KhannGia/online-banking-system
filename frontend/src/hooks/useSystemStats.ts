import { useAccount, useReadContract, useReadContracts } from 'wagmi'
import { savingCoreAbi } from '../generated'
import { getAddress } from '../config/contracts'
import { decodeDeposit, DepositStatus } from '../lib/deposit'

export type PlanStat = { activeCount: number; activeTvl: bigint }

export type SystemStats = {
  isLoading: boolean
  totalDepositsEverOpened: number
  activeCount: number
  activeTvl: bigint
  byPlan: Map<string, PlanStat>
}

// Reads every deposit by id (SavingCore's own `deposits`/`nextDepositId` getters) and
// aggregates system-wide totals — the same "loop by id via a single multicall" approach
// keeper-bot.ts uses, deliberately not an event-log scan: this project already hit
// eth_getLogs range rejections on the default Sepolia RPC (see useDeposits.ts), and a
// multicall over public mapping getters has no such range limit.
export function useSystemStats(): SystemStats {
  const { chainId } = useAccount()
  const core = chainId ? getAddress('SavingCore', chainId) : undefined

  const { data: nextId } = useReadContract({
    address: core, abi: savingCoreAbi, functionName: 'nextDepositId',
    query: { enabled: !!core },
  })
  const n = nextId ? Number(nextId) : 0

  const { data, isLoading } = useReadContracts({
    query: { enabled: !!core && n > 0 },
    contracts: Array.from({ length: n }, (_, i) => ({
      address: core, abi: savingCoreAbi, functionName: 'deposits', args: [BigInt(i)],
    })),
  })

  let activeCount = 0
  let activeTvl = 0n
  const byPlan = new Map<string, PlanStat>()

  for (let i = 0; i < (data?.length ?? 0); i++) {
    const result = data![i].result
    if (!result) continue
    const d = decodeDeposit(result as Parameters<typeof decodeDeposit>[0], BigInt(i))
    if (d.status !== DepositStatus.Active) continue

    activeCount++
    activeTvl += d.principal

    const planKey = d.planId.toString()
    const prev = byPlan.get(planKey) ?? { activeCount: 0, activeTvl: 0n }
    byPlan.set(planKey, { activeCount: prev.activeCount + 1, activeTvl: prev.activeTvl + d.principal })
  }

  return { isLoading, totalDepositsEverOpened: n, activeCount, activeTvl, byPlan }
}
