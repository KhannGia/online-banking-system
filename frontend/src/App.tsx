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
  const { corePaused } = useSystemState()

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
        {!isConnected ? (
          <div className="text-slate-400">Connect a wallet to view plans and deposits.</div>
        ) : (
          <>
            {tab === 'deposit' && <PlansView onOpened={refreshAll} />}
            {tab === 'my' && <MyDeposits onChanged={refreshAll} />}
            {tab === 'admin' && showAdmin && <AdminPanel onChanged={refreshAll} />}
          </>
        )}
      </main>
    </div>
  )
}
