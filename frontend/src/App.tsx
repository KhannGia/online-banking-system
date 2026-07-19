import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { Header } from './components/Header'
import { ChainGuard } from './components/ChainGuard'
import { PlansView } from './components/PlansView'
import { MyDeposits } from './components/MyDeposits'
import { AdminPanel } from './components/AdminPanel'
import { useIsOwner } from './hooks/useIsOwner'
import { useSystemState } from './hooks/useSystemState'

export default function App() {
  const [tab, setTab] = useState<'deposit' | 'my' | 'admin'>('deposit')
  const showAdmin = useIsOwner()
  const queryClient = useQueryClient()
  const refreshAll = () => queryClient.invalidateQueries()
  const { isConnected } = useAccount()
  const { corePaused, vaultPaused } = useSystemState()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header tab={tab} setTab={setTab} showAdmin={showAdmin} />
      <main className="max-w-5xl mx-auto px-6 py-6 space-y-4">
        <ChainGuard />
        {corePaused && (
          <div className="bg-rose-600/20 border border-rose-500 text-rose-200 px-4 py-2 rounded-md text-sm">
            System is paused — deposits and withdrawals are disabled.
          </div>
        )}
        {!corePaused && vaultPaused && (
          <div className="bg-rose-600/20 border border-rose-500 text-rose-200 px-4 py-2 rounded-md text-sm">
            Interest payouts are paused — withdraw, renew, auto-renew and claim are disabled. Early withdraw and opening new deposits still work.
          </div>
        )}
        {!isConnected ? (
          <div className="text-slate-400">Connect a wallet to view plans and deposits.</div>
        ) : (
          <>
            {tab === 'deposit' && <PlansView onOpened={refreshAll} />}
            {tab === 'my' && <MyDeposits onChanged={refreshAll} />}
            {/*
              Deliberately not gated on `showAdmin` here: showAdmin comes from a
              network read that can momentarily report "unknown" (e.g. right after
              a background refetch/observer remount). Gating the panel's presence
              on that value unmounts AdminPanel whenever it blips, which resets all
              of its in-progress form state (useState re-initializes on remount) —
              the panel does its own (remount-proof) owner check internally instead.
              Header still hides the Admin nav entry unless showAdmin is true, so a
              non-owner has no ordinary way to land on this tab in the first place.
            */}
            {tab === 'admin' && <AdminPanel onChanged={refreshAll} />}
          </>
        )}
      </main>
    </div>
  )
}
