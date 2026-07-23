// Shared Tailwind class strings for the "Vault Ledger" visual system: warm
// charcoal (ink-*) surfaces, a brass (amber) hairline accent on cards, emerald
// as the primary action color, monospace for financial figures. Centralized
// here (rather than repeated per component) because every screen in this app
// reuses the same handful of surfaces — card, input, and four button variants.

export const card =
  'relative bg-ink-900 border border-ink-700 rounded-2xl p-5 space-y-3 shadow-lg shadow-black/30 ' +
  "before:absolute before:inset-x-5 before:top-0 before:h-px before:content-[''] " +
  'before:bg-gradient-to-r before:from-transparent before:via-amber-500/50 before:to-transparent'

export const input =
  'w-full bg-ink-800 border border-ink-600 rounded-lg px-3 py-2 text-sm font-mono placeholder:font-sans ' +
  'placeholder:text-ink-500 text-ink-100 outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 ' +
  'transition-colors'

const btnBase =
  'px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed'

export const btnPrimary = `${btnBase} bg-emerald-600 hover:bg-emerald-500 text-emerald-50 shadow-sm shadow-emerald-950/40`
export const btnSecondary = `${btnBase} bg-ink-800 hover:bg-ink-700 border border-ink-600 text-ink-200`
export const btnDanger = `${btnBase} bg-rose-800/90 hover:bg-rose-700 text-rose-50`
export const btnWarn = `${btnBase} bg-amber-700/90 hover:bg-amber-600 text-amber-50`

export const modalOverlay = 'fixed inset-0 bg-ink-950/80 backdrop-blur-sm flex items-center justify-center z-50'
export const modalPanel = 'bg-ink-900 border border-ink-600 rounded-2xl p-6 w-96 space-y-4 shadow-2xl shadow-black/50'

export const label = 'text-xs uppercase tracking-wide text-ink-500 font-medium'
