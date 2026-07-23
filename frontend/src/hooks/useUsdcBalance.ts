import { useAccount, useReadContract } from 'wagmi'
import { mockUsdcAbi } from '../generated'
import { getAddress } from '../config/contracts'

export function useUsdcBalance() {
  const { address, chainId } = useAccount()
  const usdc = chainId ? getAddress('MockUSDC', chainId) : undefined

  const { data: balance } = useReadContract({
    address: usdc, abi: mockUsdcAbi, functionName: 'balanceOf',
    args: address ? [address] : undefined, query: { enabled: !!usdc && !!address },
  })

  return balance as bigint | undefined
}
