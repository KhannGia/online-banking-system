import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Header } from './components/Header'
import { ChainGuard } from './components/ChainGuard'
import { PlansView } from './components/PlansView'
import { MyDeposits } from './components/MyDeposits'
import { useIsOwner } from './hooks/useIsOwner'

export default function App() {
  const [tab, setTab] = useState<'deposit' | 'my' | 'admin'>('deposit')
  const showAdmin = useIsOwner()
  const queryClient = useQueryClient()
  const refreshAll = () => queryClient.invalidateQueries()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header tab={tab} setTab={setTab} showAdmin={showAdmin} />
      <main className="max-w-5xl mx-auto px-6 py-6 space-y-4">
        <ChainGuard />
        {tab === 'deposit' && <PlansView onOpened={refreshAll} />}
        {tab === 'my' && <MyDeposits onChanged={refreshAll} />}
        {tab === 'admin' && showAdmin && <div className="text-slate-400">Admin — Task 10.</div>}
      </main>
    </div>
  )
}
