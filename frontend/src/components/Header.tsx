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
    <header className="border-b border-ink-700 bg-ink-950/80 backdrop-blur supports-[backdrop-filter]:bg-ink-950/60">
      <div className="max-w-5xl mx-auto flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-8">
          <span className="flex items-center gap-2.5 font-display font-semibold text-xl tracking-tight text-ink-50">
            <span aria-hidden className="inline-block w-6 h-6 rounded-full border-2 border-amber-500/70 relative">
              <span className="absolute inset-[3px] rounded-full bg-gradient-to-br from-amber-400/80 to-emerald-600/80" />
            </span>
            SavingCore <span className="text-amber-500/90 font-normal italic">Bank</span>
          </span>
          <nav className="flex gap-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative px-3 py-1.5 text-sm transition-colors ${
                  tab === t.id ? 'text-ink-50' : 'text-ink-500 hover:text-ink-200'
                }`}
              >
                {t.label}
                {tab === t.id && (
                  <span aria-hidden className="absolute left-2 right-2 -bottom-[17px] h-0.5 bg-amber-500 rounded-full" />
                )}
              </button>
            ))}
          </nav>
        </div>
        <ConnectButton />
      </div>
    </header>
  )
}
