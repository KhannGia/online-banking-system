import { useSyncExternalStore } from 'react'
import { subscribeTxHistory, getTxHistorySnapshot } from '../lib/txHistory'

export function useTxHistory() {
  return useSyncExternalStore(subscribeTxHistory, getTxHistorySnapshot)
}
