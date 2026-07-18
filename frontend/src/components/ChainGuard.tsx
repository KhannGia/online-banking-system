import { useAccount } from 'wagmi'
import { SUPPORTED_CHAIN_IDS, isDeployedOn } from '../config/contracts'

/** True when connected to a chain the app doesn't support at all. */
export function useUnsupportedChain(): boolean {
  const { chainId, isConnected } = useAccount()
  return isConnected && !!chainId && !SUPPORTED_CHAIN_IDS.includes(chainId as 31337 | 11155111)
}

/** True when the chain is supported but the contracts aren't deployed there yet. */
export function useMissingDeployment(): boolean {
  const { chainId, isConnected } = useAccount()
  if (!isConnected || !chainId) return false
  return SUPPORTED_CHAIN_IDS.includes(chainId as 31337 | 11155111) && !isDeployedOn(chainId)
}

const banner = 'border px-4 py-2 rounded-md text-sm'

export function ChainGuard() {
  const unsupported = useUnsupportedChain()
  const missing = useMissingDeployment()

  if (unsupported) {
    return (
      <div className={`${banner} bg-amber-600/20 border-amber-500 text-amber-200`}>
        Unsupported network. Switch to Hardhat (31337) or Sepolia (11155111) to continue.
      </div>
    )
  }
  if (missing) {
    return (
      <div className={`${banner} bg-amber-600/20 border-amber-500 text-amber-200`}>
        Contracts are not deployed on this network yet. Deploy them (see the README) and re-run
        <code className="mx-1 px-1 bg-slate-800 rounded">npm run codegen</code>, or switch networks.
      </div>
    )
  }
  return null
}
