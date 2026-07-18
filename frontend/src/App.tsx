import { useState } from 'react'
import { Header } from './components/Header'
import { ChainGuard } from './components/ChainGuard'

export default function App() {
  const [tab, setTab] = useState<'deposit' | 'my' | 'admin'>('deposit')
  const showAdmin = false // wired to useIsOwner() in Task 7

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header tab={tab} setTab={setTab} showAdmin={showAdmin} />
      <main className="max-w-5xl mx-auto px-6 py-6 space-y-4">
        <ChainGuard />
        <div className="text-slate-400">Connect a wallet to begin.</div>
      </main>
    </div>
  )
}
