// In-memory, session-only log of transactions submitted through TxButton, so the
// user has somewhere to look up a hash after the toast that announced it is gone.
// Not persisted and not backed by an on-chain log scan (unlike useDeposits) — this
// only remembers what happened in the current tab session, which is enough for
// "what was the hash of the thing I just did".

export type TxHistoryEntry = {
  id: string
  label: string
  hash: `0x${string}`
  chainId: number
  timestamp: number
}

const MAX_ENTRIES = 20

let entries: TxHistoryEntry[] = []
const listeners = new Set<() => void>()

export function addTxHistoryEntry(entry: { label: string; hash: `0x${string}`; chainId: number }) {
  entries = [{ ...entry, id: `${entry.hash}-${entries.length}`, timestamp: Date.now() }, ...entries].slice(0, MAX_ENTRIES)
  for (const listener of listeners) listener()
}

export function subscribeTxHistory(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getTxHistorySnapshot(): TxHistoryEntry[] {
  return entries
}

const EXPLORERS: Record<number, string> = {
  11155111: 'https://sepolia.etherscan.io',
}

/** Undefined when the chain has no known block explorer (e.g. the local Hardhat network). */
export function explorerTxUrl(chainId: number, hash: string): string | undefined {
  const base = EXPLORERS[chainId]
  return base ? `${base}/tx/${hash}` : undefined
}
