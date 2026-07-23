import { useState } from 'react'
import { useTxHistory } from '../hooks/useTxHistory'
import { explorerTxUrl } from '../lib/txHistory'
import { shortHash } from '../lib/format'

export function ActivityPanel() {
  const [open, setOpen] = useState(false)
  const entries = useTxHistory()

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative text-sm text-ink-400 hover:text-ink-200 transition-colors px-2 py-1"
      >
        Activity
        {entries.length > 0 && (
          <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500/90 text-ink-950 text-[10px] font-semibold">
            {entries.length}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-ink-900 border border-ink-600 rounded-xl shadow-2xl shadow-black/50 z-50 max-h-96 overflow-y-auto">
            <div className="px-4 py-2.5 border-b border-ink-700">
              <p className="font-display text-sm text-ink-100">Recent activity</p>
              <p className="text-xs text-ink-500">This session only — cleared on page reload.</p>
            </div>
            {entries.length === 0 ? (
              <p className="px-4 py-6 text-sm text-ink-500 text-center">No transactions yet.</p>
            ) : (
              <ul className="divide-y divide-ink-800">
                {entries.map((e) => {
                  const url = explorerTxUrl(e.chainId, e.hash)
                  return (
                    <li key={e.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm text-ink-200">{e.label}</p>
                        <p className="text-xs font-mono text-ink-500">{shortHash(e.hash)}</p>
                      </div>
                      {url ? (
                        <a href={url} target="_blank" rel="noreferrer" className="text-xs text-amber-500 hover:text-amber-400 shrink-0">
                          View ↗
                        </a>
                      ) : (
                        <button
                          onClick={() => navigator.clipboard.writeText(e.hash)}
                          className="text-xs text-ink-400 hover:text-ink-200 shrink-0"
                        >
                          Copy
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
