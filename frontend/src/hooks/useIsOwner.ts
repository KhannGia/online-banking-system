import { useAccount } from 'wagmi'
import { useSystemState } from './useSystemState'

export function useIsOwner(): boolean {
  const { address } = useAccount()
  const { owner } = useSystemState()
  return !!address && !!owner && address.toLowerCase() === owner.toLowerCase()
}
