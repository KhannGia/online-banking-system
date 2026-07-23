import { useAccount, usePublicClient, useReadContracts } from 'wagmi'
import type { PublicClient } from 'viem'
import { useQuery } from '@tanstack/react-query'
import { savingCoreAbi } from '../generated'
import { getAddress, deployFromBlock, isDeployedOn } from '../config/contracts'
import { decodeDeposit, type DepositRaw } from '../lib/deposit'

// Public RPCs commonly reject eth_getLogs above a fixed range. The default Sepolia
// RPC (thirdweb) has been observed rejecting ranges as low as 1,000 blocks
// ("Log response size exceeded"), despite also citing a 10,000-block cap in other
// error messages — stay well under the smaller, size-dependent limit.
const MAX_LOG_RANGE = 500n

async function getDepositOpenedLogsChunked(client: PublicClient, address: `0x${string}`, fromBlock: bigint) {
  const latest = await client.getBlockNumber()
  const logs = []
  for (let start = fromBlock; start <= latest; start += MAX_LOG_RANGE + 1n) {
    const end = start + MAX_LOG_RANGE < latest ? start + MAX_LOG_RANGE : latest
    const chunk = await client.getContractEvents({
      address, abi: savingCoreAbi, eventName: 'DepositOpened',
      fromBlock: start, toBlock: end,
    })
    logs.push(...chunk)
  }
  return logs
}

export function useDeposits() {
  const { address, chainId } = useAccount()
  const client = usePublicClient()
  const core = chainId ? getAddress('SavingCore', chainId) : undefined

  // 1) find candidate depositIds from DepositOpened logs (owner arg is not indexed → filter client-side)
  const idsQuery = useQuery({
    queryKey: ['depositIds', chainId, address, core],
    enabled: !!client && !!core && !!address && !!chainId && isDeployedOn(chainId),
    queryFn: async () => {
      const logs = await getDepositOpenedLogsChunked(client!, core!, deployFromBlock(chainId!))
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
      // decodeDeposit() maps by index and is pinned by tests (see lib/deposit.ts).
      const t = data[i * 2 + 1]?.result as
        | readonly [bigint, bigint, bigint, bigint, bigint, bigint, bigint, number, bigint]
        | undefined
      if (owner && t && owner.toLowerCase() === address!.toLowerCase()) {
        deposits.push(decodeDeposit(t, ids[i]))
      }
    }
  }

  return {
    deposits,
    isLoading: idsQuery.isLoading || isLoading,
    isError: idsQuery.isError,
    error: idsQuery.error,
    refetch: () => { idsQuery.refetch(); refetch() },
  }
}
