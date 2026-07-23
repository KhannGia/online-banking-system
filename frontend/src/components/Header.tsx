import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useUsdcBalance } from '../hooks/useUsdcBalance'
import { formatUsdc } from '../lib/format'
import { ActivityPanel } from './ActivityPanel'

export function Header({ tab, setTab, showAdmin }: {
  tab: string
  setTab: (t: 'deposit' | 'my' | 'admin' | 'about') => void
  showAdmin: boolean
}) {
  const { isConnected } = useAccount()
  const balance = useUsdcBalance()
  const tabs: { id: 'deposit' | 'my' | 'admin'; label: string }[] = [
    { id: 'deposit', label: 'Deposit' },
    { id: 'my', label: 'My Deposits' },
    ...(showAdmin ? [{ id: 'admin' as const, label: 'Admin' }] : []),
  ]
  return (
    <header className="relative z-20 border-b border-ink-700 bg-ink-950/80 backdrop-blur supports-[backdrop-filter]:bg-ink-950/60">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-6 px-6 py-4">
        <div className="flex items-center gap-7 shrink-0">
          <button
            onClick={() => setTab('about')}
            className="flex items-center gap-2.5 font-display font-semibold text-xl tracking-tight text-ink-50 whitespace-nowrap hover:opacity-80 transition-opacity"
          >
            <span aria-hidden className="inline-block w-6 h-6 rounded-full border-2 border-amber-500/70 relative shrink-0">
              <span className="absolute inset-[3px] rounded-full bg-gradient-to-br from-amber-400/80 to-emerald-600/80" />
            </span>
            SavingCore <span className="text-amber-500/90 font-normal italic">Bank</span>
          </button>
          <nav className="flex gap-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative px-3 py-1.5 text-sm whitespace-nowrap transition-colors ${
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
        <div className="flex items-center gap-3 shrink-0">
          {isConnected && (
            <span className="whitespace-nowrap text-sm font-mono text-ink-200 bg-ink-800/80 border border-ink-700 rounded-full px-3 py-1.5">
              {balance !== undefined ? formatUsdc(balance) : '—'} <span className="text-ink-500 font-sans">USDC</span>
            </span>
          )}
          <ActivityPanel />
          <ConnectButton showBalance={false} />
        </div>
      </div>
    </header>
  )
}
