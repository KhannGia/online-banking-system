import { useAccount, usePublicClient, useReadContracts } from 'wagmi'
import { useQuery } from '@tanstack/react-query'
import { savingCoreAbi } from '../generated'
import { getAddress, deployFromBlock, isDeployedOn } from '../config/contracts'
import type { DepositRaw } from '../lib/deposit'

export function useDeposits() {
  const { address, chainId } = useAccount()
  const client = usePublicClient()
  const core = chainId ? getAddress('SavingCore', chainId) : undefined

  // 1) find candidate depositIds from DepositOpened logs (owner arg is not indexed → filter client-side)
  const idsQuery = useQuery({
    queryKey: ['depositIds', chainId, address, core],
    enabled: !!client && !!core && !!address && !!chainId && isDeployedOn(chainId),
    queryFn: async () => {
      const logs = await client!.getContractEvents({
        address: core!, abi: savingCoreAbi, eventName: 'DepositOpened',
        fromBlock: deployFromBlock(chainId!), toBlock: 'latest',
      })
      const ids = new Set<bigint>()
      for (const log of logs) {
        const a = log.args as { depositId?: bigint; owner?: `0x${string}` }
        if (a.owner && a.depositId !== undefined && a.owner.toLowerCase() === address!.toLowerCase()) {
          ids.add(a.depositId)
        }
      }
      return [...ids]
    },
  })
  const ids = idsQuery.data ?? []

  // 2) read current owner + struct for each candidate; keep those still owned by the user
  const { data, isLoading, refetch } = useReadContracts({
    query: { enabled: ids.length > 0 },
    contracts: ids.flatMap((id) => [
      { address: core, abi: savingCoreAbi, functionName: 'ownerOf', args: [id] } as const,
      { address: core, abi: savingCoreAbi, functionName: 'deposits', args: [id] } as const,
    ]),
  })

  const deposits: DepositRaw[] = []
  if (data) {
    for (let i = 0; i < ids.length; i++) {
      const owner = data[i * 2]?.result as `0x${string}` | undefined
      // `deposits(id)` is an auto-generated public-mapping getter with NINE separate
      // outputs, so viem decodes it as a positional tuple/array, not a named object.
      // Destructure by index (see fe-task-7 Correction 1).
      const t = data[i * 2 + 1]?.result as
        | readonly [bigint, bigint, bigint, bigint, bigint, bigint, bigint, number, bigint]
        | undefined
      if (owner && t && owner.toLowerCase() === address!.toLowerCase()) {
        deposits.push({
          depositId: ids[i],
          planId: t[0],
          principal: t[1],
          startAt: t[2],
          maturityAt: t[3],
          aprBpsAtOpen: t[4],
          penaltyBpsAtOpen: t[5],
          tenorDaysAtOpen: t[6],
          status: Number(t[7]),
          pendingInterest: t[8],
        })
      }
    }
  }

  return {
    deposits,
    isLoading: idsQuery.isLoading || isLoading,
    refetch: () => { idsQuery.refetch(); refetch() },
  }
}
