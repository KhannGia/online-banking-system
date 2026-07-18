import { ConnectButton } from '@rainbow-me/rainbowkit'

export function Header({ tab, setTab, showAdmin }: {
  tab: string
  setTab: (t: 'deposit' | 'my' | 'admin') => void
  showAdmin: boolean
}) {
  const tabs: { id: 'deposit' | 'my' | 'admin'; label: string }[] = [
    { id: 'deposit', label: 'Deposit' },
    { id: 'my', label: 'My Deposits' },
    ...(showAdmin ? [{ id: 'admin' as const, label: 'Admin' }] : []),
  ]
  return (
    <header className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
      <div className="flex items-center gap-6">
        <span className="font-semibold text-lg">SavingCore Bank</span>
        <nav className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-md text-sm ${tab === t.id ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>
      <ConnectButton />
    </header>
  )
}
