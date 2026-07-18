import { useAccount, useReadContracts } from 'wagmi'
import { savingCoreAbi, vaultManagerAbi } from '../generated'
import { getAddress } from '../config/contracts'

export function useSystemState() {
  const { chainId } = useAccount()
  const core = chainId ? getAddress('SavingCore', chainId) : undefined
  const vault = chainId ? getAddress('VaultManager', chainId) : undefined
  const enabled = !!core && !!vault

  const { data } = useReadContracts({
    query: { enabled },
    contracts: [
      { address: core, abi: savingCoreAbi, functionName: 'owner' },
      { address: core, abi: savingCoreAbi, functionName: 'paused' },
      { address: core, abi: savingCoreAbi, functionName: 'GRACE_PERIOD' },
      { address: core, abi: savingCoreAbi, functionName: 'keeperRewardBps' },
      { address: vault, abi: vaultManagerAbi, functionName: 'feeReceiver' },
      { address: vault, abi: vaultManagerAbi, functionName: 'vaultBalance' },
      { address: vault, abi: vaultManagerAbi, functionName: 'paused' },
    ],
  })

  return {
    owner: data?.[0]?.result as `0x${string}` | undefined,
    corePaused: (data?.[1]?.result as boolean) ?? false,
    gracePeriod: (data?.[2]?.result as bigint) ?? 259200n,
    keeperRewardBps: (data?.[3]?.result as bigint) ?? 0n,
    feeReceiver: data?.[4]?.result as `0x${string}` | undefined,
    vaultBalance: (data?.[5]?.result as bigint) ?? 0n,
    vaultPaused: (data?.[6]?.result as boolean) ?? false,
  }
}
