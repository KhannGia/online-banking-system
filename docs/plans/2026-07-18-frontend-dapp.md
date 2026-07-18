# SavingCore dApp Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a React dApp (`capstone/frontend/`) that connects MetaMask and lets a depositor view plans, open deposits, view their deposits, and withdraw/renew — plus bonus actions (C1 claim, G auto-renew) and an owner-only Admin page (plans, vault funding, F timelock, pause, fees, keeper rate, mint helper).

**Architecture:** Vite + React + TypeScript SPA. wagmi v2 / viem / RainbowKit for wallet + chain. Contract ABIs and per-chain addresses are code-generated from the Hardhat project's `deployments/` by `@wagmi/cli`. Pure logic (amount formatting, deposit-action derivation, revert decoding) lives in `src/lib/` and is unit-tested with Vitest; React components read/write through wagmi's base hooks using the generated `*Abi`/`*Address` constants. Deposit enumeration is client-side (`getLogs` of `DepositOpened` + `ownerOf` checks) because the ERC-721 isn't Enumerable and the event owner isn't indexed.

**Tech Stack:** Vite, React 18, TypeScript, wagmi v2, viem v2, @rainbow-me/rainbowkit v2, @tanstack/react-query v5, @wagmi/cli, Tailwind CSS v3, sonner, Vitest.

## Global Constraints

- All work happens in `capstone/frontend/` unless a step says otherwise. The Hardhat contracts package is the sibling `capstone/hardhat-temp/`.
- Monorepo git root is `capstone/`. Stay on branch `feat/frontend-dapp` (created in Task 1). Do NOT commit with a `Co-Authored-By: Claude` trailer — the user forbids it on this project.
- Node 26, npm 11 are installed. wagmi v2 uses **viem**, not ethers — do not add ethers to the frontend.
- Chains: Hardhat local `31337` (RPC `http://127.0.0.1:8545`) and Sepolia `11155111`.
- MockUSDC has **6 decimals**: 1 USDC = 1_000_000 base units. All amounts formatted/parsed at 6 decimals.
- Personal-variant values (must match the deployed default plan and any pre-filled forms): grace **3 days**, default APR **225 bps**, penalty **550 bps**, tenor **180 days**.
- Contract read/write surface (from the deployed ABIs):
  - `SavingCore`: `planCount() → uint256`, `plans(uint256) → (tenorDays,aprBps,minDeposit,maxDeposit,earlyWithdrawPenaltyBps,enabled)`, `deposits(uint256) → (planId,principal,startAt,maturityAt,aprBpsAtOpen,penaltyBpsAtOpen,tenorDaysAtOpen,status,pendingInterest)`, `previewInterest(uint256) → uint256`, `owner() → address`, `paused() → bool`, `keeperRewardBps() → uint256`, `GRACE_PERIOD() → uint256`, `ownerOf(uint256) → address`, `nextDepositId() → uint256`, `openDeposit(uint256 planId,uint256 amount)`, `withdrawAtMaturity(uint256)`, `earlyWithdraw(uint256)`, `renewDeposit(uint256 depositId,uint256 newPlanId)`, `autoRenewDeposit(uint256)`, `claimInterest(uint256)`, `createPlan(uint256,uint256,uint256,uint256,uint256)`, `updatePlan(uint256,uint256)`, `enablePlan(uint256)`, `disablePlan(uint256)`, `setKeeperRewardBps(uint256)`, `pause()`, `unpause()`. Events: `DepositOpened(uint256 depositId,address owner,uint256 planId,uint256 principal,uint256 maturityAt,uint256 aprBpsAtOpen)`, `Withdrawn(...)`, `Renewed(...)`.
  - `VaultManager`: `feeReceiver() → address`, `vaultBalance() → uint256`, `paused() → bool`, `owner() → address`, `pendingWithdrawAmount() → uint256`, `withdrawExecutableAt() → uint256`, `TIMELOCK_DELAY() → uint256`, `fundVault(uint256)`, `scheduleWithdrawVault(uint256)`, `executeWithdrawVault()`, `cancelScheduledWithdrawal()`, `setFeeReceiver(address)`, `pause()`, `unpause()`.
  - `MockUSDC`: `decimals() → uint8`, `balanceOf(address) → uint256`, `allowance(address,address) → uint256`, `approve(address,uint256)`, `mint(address,uint256)`.
  - `DepositStatus` enum order: `0 Active, 1 Withdrawn, 2 ManualRenewed, 3 AutoRenewed`.
- Commands run from `capstone/frontend/`: `npm run dev`, `npm run build` (tsc + vite build — the typecheck+bundle gate), `npm test` (vitest run), `npm run codegen` (`wagmi generate`).

## File Structure

```
frontend/
  index.html, package.json, vite.config.ts, tsconfig.json, tsconfig.node.json
  tailwind.config.ts, postcss.config.js
  wagmi.config.ts                 # @wagmi/cli codegen config
  scripts/sync-deploy-blocks.mjs  # writes src/config/deployBlocks.json
  .env.example
  src/
    main.tsx                      # providers
    App.tsx                       # layout + tabs
    index.css                     # tailwind directives
    generated.ts                  # committed codegen output (ABIs + address maps)
    config/
      wagmi.ts                    # chains, transports, RainbowKit config
      contracts.ts                # getAddress(name, chainId), deployFromBlock(chainId)
      deployBlocks.json           # committed codegen output { chainId: deployBlock }
    lib/
      format.ts                   # formatUsdc/parseUsdc/bpsToPercent/formatCountdown
      deposit.ts                  # DepositStatus, DepositRaw, deriveDepositView
      errors.ts                   # decodeRevert
      __tests__/{format,deposit,errors}.test.ts
    hooks/
      useSystemState.ts
      usePlans.ts
      useIsOwner.ts
      useDeposits.ts
    components/
      Header.tsx, ChainGuard.tsx, TxButton.tsx
      PlansView.tsx, OpenDepositDialog.tsx
      MyDeposits.tsx, DepositRow.tsx, RenewDialog.tsx
      AdminPanel.tsx
  README.md
```

---

### Task 1: Scaffold Vite + React + TS + Tailwind, app shell

**Files:**
- Create: the whole `frontend/` scaffold (`package.json`, `vite.config.ts`, `tsconfig*.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `tailwind.config.ts`, `postcss.config.js`, `.gitignore`).

**Interfaces:**
- Produces: a buildable app (`npm run build` passes), Tailwind working, Vitest runnable.

- [ ] **Step 1: Create the branch and scaffold Vite**

```bash
cd /home/khangia/capstone
git checkout -b feat/frontend-dapp
npm create vite@latest frontend -- --template react-ts
cd frontend
```

- [ ] **Step 2: Install dependencies**

```bash
cd /home/khangia/capstone/frontend
npm install
npm install wagmi viem @tanstack/react-query @rainbow-me/rainbowkit sonner
npm install -D @wagmi/cli tailwindcss@^3 postcss autoprefixer vitest jsdom @testing-library/react @testing-library/jest-dom @types/node
```

- [ ] **Step 3: Configure Tailwind**

Create `tailwind.config.ts`:

```ts
import type { Config } from 'tailwindcss'
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
} satisfies Config
```

Create `postcss.config.js`:

```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } }
```

Replace `src/index.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 4: Add scripts and vitest config**

In `package.json`, set the `scripts` block to:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "test": "vitest run",
  "codegen": "wagmi generate && node scripts/sync-deploy-blocks.mjs"
}
```

(`sync-deploy-blocks.mjs` is created in Task 2; until then `npm run codegen` is not run.)

Replace `vite.config.ts` with (adds the vitest test env):

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true },
})
```

- [ ] **Step 5: Minimal app shell**

Replace `src/App.tsx` with:

```tsx
export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
      <h1 className="text-2xl font-semibold">SavingCore Bank</h1>
    </div>
  )
}
```

Ensure `src/main.tsx` imports `./index.css` and renders `<App />` (Vite's template already does; keep it).

- [ ] **Step 6: Verify build passes**

Run: `npm run build`
Expected: `tsc` and `vite build` succeed, `dist/` produced, no errors.

- [ ] **Step 7: Commit**

```bash
cd /home/khangia/capstone
git add frontend
git commit -m "feat(frontend): scaffold Vite + React + TS + Tailwind app shell"
```

---

### Task 2: Local deploy + @wagmi/cli codegen (committed generated.ts)

**Files:**
- Create: `frontend/wagmi.config.ts`, `frontend/src/generated.ts` (generated, committed).
- Produce (outside frontend): `hardhat-temp/deployments/localhost/{MockUSDC,VaultManager,SavingCore}.json`.

**Interfaces:**
- Produces: `savingCoreAbi`, `vaultManagerAbi`, `mockUsdcAbi`, and `savingCoreAddress`/`vaultManagerAddress`/`mockUsdcAddress` (records `{31337: '0x…'}`, plus `11155111` after a Sepolia deploy) exported from `src/generated.ts`.

- [ ] **Step 1: Start a local Hardhat node (background) and deploy**

```bash
cd /home/khangia/capstone/hardhat-temp
# terminal/background 1: a persistent local node
npx hardhat node &   # leave running; note it listens on 127.0.0.1:8545
# wait ~3s for it to be ready, then deploy against it
npx hardhat deploy --network localhost
```
Expected: deploy logs three addresses; `deployments/localhost/MockUSDC.json`, `VaultManager.json`, `SavingCore.json` now exist. (The old `Counter.json` is harmless.)

- [ ] **Step 2: Write the codegen config**

Create `frontend/wagmi.config.ts`:

```ts
import { defineConfig } from '@wagmi/cli'
import { hardhat, react } from '@wagmi/cli/plugins'
import { existsSync, readFileSync } from 'node:fs'

const NAMES = ['MockUSDC', 'VaultManager', 'SavingCore'] as const
const NETS: Record<number, string> = { 31337: 'localhost', 11155111: 'sepolia' }

function addressesFor(name: string) {
  const map: Record<number, `0x${string}`> = {}
  for (const [chainId, net] of Object.entries(NETS)) {
    const path = `../hardhat-temp/deployments/${net}/${name}.json`
    if (existsSync(path)) map[Number(chainId)] = JSON.parse(readFileSync(path, 'utf8')).address
  }
  return map
}

export default defineConfig({
  out: 'src/generated.ts',
  plugins: [
    hardhat({
      project: '../hardhat-temp',
      include: NAMES.map((n) => `${n}.json`),
      deployments: Object.fromEntries(NAMES.map((n) => [n, addressesFor(n)])),
    }),
    react(),
  ],
})
```

- [ ] **Step 3: Write the deploy-block sync script**

The deposit-log scan needs the block each deployment landed in. On Sepolia a `fromBlock` of `0` would make `getLogs` time out or be rejected (public RPCs cap the range), so this must be the real block, generated — never hardcoded.

Create `frontend/scripts/sync-deploy-blocks.mjs`:

```js
// Writes src/config/deployBlocks.json = { "<chainId>": <deployment block> }
// Source of truth: SavingCore's deployment receipt per network.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const NETS = { 31337: 'localhost', 11155111: 'sepolia' }
const out = {}

for (const [chainId, net] of Object.entries(NETS)) {
  const path = `../hardhat-temp/deployments/${net}/SavingCore.json`
  if (!existsSync(path)) continue
  const dep = JSON.parse(readFileSync(path, 'utf8'))
  const block = dep.receipt?.blockNumber
  if (block === undefined) throw new Error(`no receipt.blockNumber in ${path}`)
  out[chainId] = Number(block)
}

mkdirSync('src/config', { recursive: true })
writeFileSync('src/config/deployBlocks.json', JSON.stringify(out, null, 2) + '\n')
console.log('deployBlocks:', out)
```

- [ ] **Step 4: Generate and inspect**

```bash
cd /home/khangia/capstone/frontend
npm run codegen
```
Expected: `src/generated.ts` is written and exports `savingCoreAbi`, `vaultManagerAbi`, `mockUsdcAbi`, and the `*Address` records containing the `31337` addresses; the script prints `deployBlocks: { '31337': <n> }` and writes `src/config/deployBlocks.json`. Confirm: `grep -c "export const savingCoreAddress" src/generated.ts` prints `1`, and `cat src/config/deployBlocks.json` shows a `31337` entry.

- [ ] **Step 5: Verify the app still builds with the generated file**

Run: `npm run build`
Expected: success (the generated file typechecks).

- [ ] **Step 6: Commit (generated outputs committed on purpose)**

```bash
cd /home/khangia/capstone
git add frontend/wagmi.config.ts frontend/scripts/sync-deploy-blocks.mjs frontend/src/generated.ts frontend/src/config/deployBlocks.json
git commit -m "feat(frontend): wagmi codegen + deploy-block sync for contract wiring"
```

Note for the executor: leave the `hardhat node` from Step 1 running — later tasks' read/write verification uses it. If it has stopped, restart it and re-run `npx hardhat deploy --network localhost` (local addresses are deterministic, so `generated.ts` stays valid).

---

### Task 3: Chains config, providers, Header + ChainGuard

**Files:**
- Create: `frontend/src/config/wagmi.ts`, `frontend/src/config/contracts.ts`, `frontend/src/components/Header.tsx`, `frontend/src/components/ChainGuard.tsx`.
- Modify: `frontend/src/main.tsx`, `frontend/src/App.tsx`.
- Create: `frontend/.env.example`.

**Interfaces:**
- Consumes: `src/generated.ts` address records and `src/config/deployBlocks.json` (both produced by Task 2's `npm run codegen`).
- Produces: `config` (wagmi config), `getAddress(name, chainId) → 0x…|undefined`, `isDeployedOn(chainId) → boolean`, `deployFromBlock(chainId) → bigint`, `SUPPORTED_CHAIN_IDS`, and the guard hooks `useUnsupportedChain()` / `useMissingDeployment()` plus the `ChainGuard` component.

- [ ] **Step 1: Env example**

Create `frontend/.env.example`:

```
VITE_WC_PROJECT_ID=
VITE_SEPOLIA_RPC=
```

- [ ] **Step 2: Contracts address helper**

Create `frontend/src/config/contracts.ts`:

```ts
import { mockUsdcAddress, vaultManagerAddress, savingCoreAddress } from '../generated'
import deployBlocks from './deployBlocks.json'

const ADDRESSES: Record<string, Record<number, `0x${string}`>> = {
  MockUSDC: mockUsdcAddress as Record<number, `0x${string}`>,
  VaultManager: vaultManagerAddress as Record<number, `0x${string}`>,
  SavingCore: savingCoreAddress as Record<number, `0x${string}`>,
}

export type ContractName = 'MockUSDC' | 'VaultManager' | 'SavingCore'
export const SUPPORTED_CHAIN_IDS = [31337, 11155111] as const

export function getAddress(name: ContractName, chainId: number): `0x${string}` | undefined {
  return ADDRESSES[name]?.[chainId]
}

/** True when all three contracts have an address on this chain. */
export function isDeployedOn(chainId: number): boolean {
  return (['MockUSDC', 'VaultManager', 'SavingCore'] as const).every((n) => !!getAddress(n, chainId))
}

/**
 * Lower bound for the DepositOpened log scan: the block the contracts were
 * deployed in, generated into deployBlocks.json by `npm run codegen`.
 * Must NOT be 0 on Sepolia — public RPCs cap getLogs ranges, so an unbounded
 * scan would time out or be rejected.
 */
export function deployFromBlock(chainId: number): bigint {
  const blocks = deployBlocks as Record<string, number>
  return BigInt(blocks[String(chainId)] ?? 0)
}
```

`tsconfig.json` must allow the JSON import — ensure `"resolveJsonModule": true` is set under `compilerOptions` (Vite's React-TS template enables it; add it if `npm run build` complains).

- [ ] **Step 3: wagmi + RainbowKit config**

Create `frontend/src/config/wagmi.ts`:

```ts
import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { hardhat, sepolia } from 'wagmi/chains'
import { http } from 'viem'

export const config = getDefaultConfig({
  appName: 'SavingCore Bank',
  projectId: import.meta.env.VITE_WC_PROJECT_ID || 'demo-project-id',
  chains: [hardhat, sepolia],
  transports: {
    [hardhat.id]: http('http://127.0.0.1:8545'),
    [sepolia.id]: http(import.meta.env.VITE_SEPOLIA_RPC || undefined),
  },
  ssr: false,
})
```

- [ ] **Step 4: Providers in main.tsx**

Replace `frontend/src/main.tsx`:

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { Toaster } from 'sonner'
import '@rainbow-me/rainbowkit/styles.css'
import './index.css'
import App from './App'
import { config } from './config/wagmi'

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme()}>
          <App />
          <Toaster theme="dark" position="top-right" richColors />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
)
```

- [ ] **Step 5: ChainGuard**

Create `frontend/src/components/ChainGuard.tsx`:

```tsx
import { useAccount } from 'wagmi'
import { SUPPORTED_CHAIN_IDS, isDeployedOn } from '../config/contracts'

/** True when connected to a chain the app doesn't support at all. */
export function useUnsupportedChain(): boolean {
  const { chainId, isConnected } = useAccount()
  return isConnected && !!chainId && !SUPPORTED_CHAIN_IDS.includes(chainId as 31337 | 11155111)
}

/** True when the chain is supported but the contracts aren't deployed there yet. */
export function useMissingDeployment(): boolean {
  const { chainId, isConnected } = useAccount()
  if (!isConnected || !chainId) return false
  return SUPPORTED_CHAIN_IDS.includes(chainId as 31337 | 11155111) && !isDeployedOn(chainId)
}

const banner = 'border px-4 py-2 rounded-md text-sm'

export function ChainGuard() {
  const unsupported = useUnsupportedChain()
  const missing = useMissingDeployment()

  if (unsupported) {
    return (
      <div className={`${banner} bg-amber-600/20 border-amber-500 text-amber-200`}>
        Unsupported network. Switch to Hardhat (31337) or Sepolia (11155111) to continue.
      </div>
    )
  }
  if (missing) {
    return (
      <div className={`${banner} bg-amber-600/20 border-amber-500 text-amber-200`}>
        Contracts are not deployed on this network yet. Deploy them (see the README) and re-run
        <code className="mx-1 px-1 bg-slate-800 rounded">npm run codegen</code>, or switch networks.
      </div>
    )
  }
  return null
}
```

This second banner matters in practice: with two supported chains a user can switch to Sepolia before anything is deployed there, and without it the app would just render empty plan and deposit lists and look broken.

- [ ] **Step 6: Header**

Create `frontend/src/components/Header.tsx`:

```tsx
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
```

- [ ] **Step 7: App wires header + tabs + guard**

Replace `frontend/src/App.tsx`:

```tsx
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
```

- [ ] **Step 8: Verify build**

Run: `npm run build`
Expected: success. (Optionally `npm run dev` and confirm the header + RainbowKit ConnectButton render.)

- [ ] **Step 9: Commit**

```bash
cd /home/khangia/capstone
git add frontend
git commit -m "feat(frontend): wagmi/RainbowKit providers, header, chain guard"
```

---

### Task 4: lib/format.ts (TDD)

**Files:**
- Create: `frontend/src/lib/format.ts`, `frontend/src/lib/__tests__/format.test.ts`.

**Interfaces:**
- Produces: `formatUsdc(bigint) → string`, `parseUsdc(string) → bigint`, `bpsToPercent(bigint|number) → string`, `formatCountdown(number) → string`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/lib/__tests__/format.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { formatUsdc, parseUsdc, bpsToPercent, formatCountdown } from '../format'

describe('format', () => {
  it('formats 6-decimal USDC', () => {
    expect(formatUsdc(1_000_000n)).toBe('1')
    expect(formatUsdc(1_011_095_890n)).toBe('1011.09589')
    expect(formatUsdc(0n)).toBe('0')
  })
  it('parses USDC to base units (round-trip)', () => {
    expect(parseUsdc('1')).toBe(1_000_000n)
    expect(parseUsdc('1000.5')).toBe(1_000_500_000n)
    expect(formatUsdc(parseUsdc('1234.56'))).toBe('1234.56')
  })
  it('converts bps to percent', () => {
    expect(bpsToPercent(225)).toBe('2.25%')
    expect(bpsToPercent(550n)).toBe('5.5%')
    expect(bpsToPercent(10000)).toBe('100%')
  })
  it('formats a countdown', () => {
    expect(formatCountdown(0)).toBe('0m')
    expect(formatCountdown(90)).toBe('1m')
    expect(formatCountdown(3 * 86400 + 4 * 3600 + 11 * 60)).toBe('3d 4h 11m')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- format`
Expected: FAIL — cannot resolve `../format`.

- [ ] **Step 3: Implement format.ts**

Create `frontend/src/lib/format.ts`:

```ts
import { formatUnits, parseUnits } from 'viem'

const USDC_DECIMALS = 6

export function formatUsdc(value: bigint): string {
  return formatUnits(value, USDC_DECIMALS)
}

export function parseUsdc(value: string): bigint {
  return parseUnits(value, USDC_DECIMALS)
}

export function bpsToPercent(bps: bigint | number): string {
  const pct = Number(bps) / 100
  return `${Number(pct.toFixed(2))}%`
}

export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '0m'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return [d ? `${d}d` : '', h ? `${h}h` : '', `${m}m`].filter(Boolean).join(' ')
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- format`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
cd /home/khangia/capstone
git add frontend/src/lib/format.ts frontend/src/lib/__tests__/format.test.ts
git commit -m "feat(frontend): USDC/bps/countdown formatting helpers (tested)"
```

---

### Task 5: lib/deposit.ts — deriveDepositView (TDD)

**Files:**
- Create: `frontend/src/lib/deposit.ts`, `frontend/src/lib/__tests__/deposit.test.ts`.

**Interfaces:**
- Produces:
  - `enum DepositStatus { Active=0, Withdrawn=1, ManualRenewed=2, AutoRenewed=3 }`
  - `type DepositRaw = { depositId: bigint; planId: bigint; principal: bigint; startAt: bigint; maturityAt: bigint; aprBpsAtOpen: bigint; penaltyBpsAtOpen: bigint; tenorDaysAtOpen: bigint; status: number; pendingInterest: bigint }`
  - `deriveDepositView(d: DepositRaw, nowSecs: number, gracePeriodSecs: number, systemPaused: boolean) → DepositView` where `DepositView` has `statusLabel, isActive, isMatured, isPastGrace, secondsToMaturity, secondsToGraceEnd, hasPendingInterest, actions:{ withdrawAtMaturity, earlyWithdraw, renew, autoRenew, claimInterest }`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/lib/__tests__/deposit.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { deriveDepositView, DepositStatus, type DepositRaw } from '../deposit'

const GRACE = 3 * 86400
const base: DepositRaw = {
  depositId: 0n, planId: 0n, principal: 1_000_000_000n, startAt: 0n,
  maturityAt: BigInt(180 * 86400), aprBpsAtOpen: 225n, penaltyBpsAtOpen: 550n,
  tenorDaysAtOpen: 180n, status: DepositStatus.Active, pendingInterest: 0n,
}
const maturity = 180 * 86400

describe('deriveDepositView', () => {
  it('before maturity: only earlyWithdraw', () => {
    const v = deriveDepositView(base, maturity - 10, GRACE, false)
    expect(v.actions).toMatchObject({ earlyWithdraw: true, withdrawAtMaturity: false, renew: false, autoRenew: false })
    expect(v.isMatured).toBe(false)
  })
  it('exactly at maturity: withdraw + renew, not early, not autoRenew', () => {
    const v = deriveDepositView(base, maturity, GRACE, false)
    expect(v.actions).toMatchObject({ withdrawAtMaturity: true, renew: true, earlyWithdraw: false, autoRenew: false })
    expect(v.isMatured).toBe(true)
  })
  it('exactly at grace end: autoRenew becomes available', () => {
    expect(deriveDepositView(base, maturity + GRACE - 1, GRACE, false).actions.autoRenew).toBe(false)
    expect(deriveDepositView(base, maturity + GRACE, GRACE, false).actions.autoRenew).toBe(true)
  })
  it('paused: all lifecycle actions off', () => {
    const v = deriveDepositView(base, maturity + GRACE, GRACE, true)
    expect(v.actions).toMatchObject({ withdrawAtMaturity: false, earlyWithdraw: false, renew: false, autoRenew: false, claimInterest: false })
  })
  it('pendingInterest gates claim independent of status', () => {
    const withdrawn: DepositRaw = { ...base, status: DepositStatus.Withdrawn, pendingInterest: 500n }
    const v = deriveDepositView(withdrawn, maturity + 1, GRACE, false)
    expect(v.actions.claimInterest).toBe(true)
    expect(v.actions.withdrawAtMaturity).toBe(false) // not Active
    expect(v.statusLabel).toBe('Withdrawn')
  })
  it('non-active deposit offers no lifecycle actions', () => {
    const renewed: DepositRaw = { ...base, status: DepositStatus.ManualRenewed }
    const v = deriveDepositView(renewed, maturity + 1, GRACE, false)
    expect(v.actions).toMatchObject({ withdrawAtMaturity: false, renew: false, autoRenew: false, earlyWithdraw: false })
    expect(v.statusLabel).toBe('Manually renewed')
  })
})

import { quoteInterest } from '../deposit'

describe('quoteInterest', () => {
  it('matches the contract formula for both worked examples', () => {
    // 1000 USDC @ 225 bps / 180 days → 11,095,890 base units
    expect(quoteInterest(1_000_000_000n, 225n, 180n)).toBe(11_095_890n)
    // 1000 USDC @ 250 bps / 90 days → 6,164,383 base units
    expect(quoteInterest(1_000_000_000n, 250n, 90n)).toBe(6_164_383n)
  })
  it('truncates sub-unit interest to zero', () => {
    expect(quoteInterest(10n, 1n, 1n)).toBe(0n)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- deposit`
Expected: FAIL — cannot resolve `../deposit`.

- [ ] **Step 3: Implement deposit.ts**

Create `frontend/src/lib/deposit.ts`:

```ts
export enum DepositStatus { Active = 0, Withdrawn = 1, ManualRenewed = 2, AutoRenewed = 3 }

export type DepositRaw = {
  depositId: bigint
  planId: bigint
  principal: bigint
  startAt: bigint
  maturityAt: bigint
  aprBpsAtOpen: bigint
  penaltyBpsAtOpen: bigint
  tenorDaysAtOpen: bigint
  status: number
  pendingInterest: bigint
}

export type DepositView = {
  statusLabel: string
  isActive: boolean
  isMatured: boolean
  isPastGrace: boolean
  secondsToMaturity: number
  secondsToGraceEnd: number
  hasPendingInterest: boolean
  actions: {
    withdrawAtMaturity: boolean
    earlyWithdraw: boolean
    renew: boolean
    autoRenew: boolean
    claimInterest: boolean
  }
}

const STATUS_LABEL: Record<number, string> = {
  [DepositStatus.Active]: 'Active',
  [DepositStatus.Withdrawn]: 'Withdrawn',
  [DepositStatus.ManualRenewed]: 'Manually renewed',
  [DepositStatus.AutoRenewed]: 'Auto-renewed',
}

// Client-side interest quote (same simple-interest formula as SavingCore._computeInterest).
// BigInt is arbitrary-precision so plain (a*b*c)/d equals the contract's Math.mulDiv here.
export function quoteInterest(principal: bigint, aprBps: bigint, tenorDays: bigint): bigint {
  const tenorSeconds = tenorDays * 86400n
  return (principal * aprBps * tenorSeconds) / (31_536_000n * 10_000n)
}

export function deriveDepositView(
  d: DepositRaw,
  nowSecs: number,
  gracePeriodSecs: number,
  systemPaused: boolean,
): DepositView {
  const maturity = Number(d.maturityAt)
  const graceEnd = maturity + gracePeriodSecs
  const isActive = d.status === DepositStatus.Active
  const isMatured = nowSecs >= maturity
  const isPastGrace = nowSecs >= graceEnd
  const hasPendingInterest = d.pendingInterest > 0n
  const live = isActive && !systemPaused

  return {
    statusLabel: STATUS_LABEL[d.status] ?? 'Unknown',
    isActive,
    isMatured,
    isPastGrace,
    secondsToMaturity: Math.max(0, maturity - nowSecs),
    secondsToGraceEnd: Math.max(0, graceEnd - nowSecs),
    hasPendingInterest,
    actions: {
      withdrawAtMaturity: live && isMatured,
      earlyWithdraw: live && !isMatured,
      renew: live && isMatured,
      autoRenew: live && isPastGrace,
      claimInterest: hasPendingInterest && !systemPaused,
    },
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- deposit`
Expected: PASS (8 tests — 6 for deriveDepositView, 2 for quoteInterest, including the 11,095,890 and 6,164,383 worked examples).

- [ ] **Step 5: Commit**

```bash
cd /home/khangia/capstone
git add frontend/src/lib/deposit.ts frontend/src/lib/__tests__/deposit.test.ts
git commit -m "feat(frontend): deriveDepositView + interest quote mirroring contract math (tested)"
```

---

### Task 6: lib/errors.ts — revert decoding (TDD)

**Files:**
- Create: `frontend/src/lib/errors.ts`, `frontend/src/lib/__tests__/errors.test.ts`.

**Interfaces:**
- Produces: `decodeRevert(error: unknown) → string`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/lib/__tests__/errors.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { decodeRevert } from '../errors'

describe('decodeRevert', () => {
  it('maps known contract revert strings to friendly text', () => {
    expect(decodeRevert(new Error('execution reverted: not matured'))).toMatch(/not.*matured/i)
    expect(decodeRevert({ shortMessage: 'plan disabled' })).toMatch(/disabled/i)
  })
  it('recognizes OZ custom errors', () => {
    expect(decodeRevert({ message: 'OwnableUnauthorizedAccount(0xabc)' })).toMatch(/owner|authoriz/i)
    expect(decodeRevert({ message: 'EnforcedPause()' })).toMatch(/pause/i)
  })
  it('handles user rejection', () => {
    expect(decodeRevert({ message: 'User rejected the request' })).toMatch(/rejected/i)
  })
  it('falls back to a generic message', () => {
    expect(decodeRevert(null)).toBe('Transaction failed')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- errors`
Expected: FAIL — cannot resolve `../errors`.

- [ ] **Step 3: Implement errors.ts**

Create `frontend/src/lib/errors.ts`:

```ts
const KNOWN: { pattern: RegExp; message: string }[] = [
  { pattern: /not matured/i, message: 'Deposit has not matured yet.' },
  { pattern: /already matured/i, message: 'Deposit has already matured — use Withdraw.' },
  { pattern: /grace not passed/i, message: 'Grace period has not passed yet.' },
  { pattern: /not active/i, message: 'This deposit is no longer active.' },
  { pattern: /plan disabled/i, message: 'That plan is disabled.' },
  { pattern: /nothing pending/i, message: 'No pending interest to claim.' },
  { pattern: /not owner/i, message: 'You are not the owner of this deposit.' },
  { pattern: /below min/i, message: 'Amount is below the plan minimum.' },
  { pattern: /above max/i, message: 'Amount is above the plan maximum.' },
  { pattern: /bad apr|bad tenor|bad penalty|bad limits|bad bps/i, message: 'Invalid plan parameters.' },
  { pattern: /timelock not elapsed/i, message: 'Timelock delay has not elapsed.' },
  { pattern: /nothing scheduled/i, message: 'No scheduled withdrawal.' },
  { pattern: /OwnableUnauthorizedAccount/i, message: 'Only the contract owner can do that.' },
  { pattern: /EnforcedPause/i, message: 'The system is paused.' },
  { pattern: /ReentrancyGuardReentrantCall/i, message: 'Reentrant call blocked.' },
  { pattern: /user rejected|denied/i, message: 'You rejected the request.' },
  { pattern: /insufficient allowance|transfer amount exceeds allowance/i, message: 'Token allowance too low — approve first.' },
]

export function decodeRevert(error: unknown): string {
  const e = error as { shortMessage?: string; message?: string; details?: string } | null
  const text = [e?.shortMessage, e?.message, e?.details].filter(Boolean).join(' ')
  if (!text) return 'Transaction failed'
  for (const { pattern, message } of KNOWN) if (pattern.test(text)) return message
  return e?.shortMessage || 'Transaction failed'
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- errors`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
cd /home/khangia/capstone
git add frontend/src/lib/errors.ts frontend/src/lib/__tests__/errors.test.ts
git commit -m "feat(frontend): revert-reason decoding for friendly tx errors (tested)"
```

---

### Task 7: Data hooks + wire Admin tab visibility

**Files:**
- Create: `frontend/src/hooks/useSystemState.ts`, `usePlans.ts`, `useIsOwner.ts`, `useDeposits.ts`.
- Modify: `frontend/src/App.tsx` (wire `useIsOwner` to `showAdmin`).

**Interfaces:**
- Consumes: `getAddress`, `deployFromBlock`, `savingCoreAbi`, `vaultManagerAbi`, `DepositRaw`, `DepositStatus`.
- Produces:
  - `useSystemState() → { owner?, corePaused, vaultPaused, gracePeriod: bigint, keeperRewardBps: bigint, feeReceiver?, vaultBalance: bigint }`
  - `usePlans() → { plans: Plan[]; isLoading }` with `Plan = { planId: bigint; tenorDays: bigint; aprBps: bigint; minDeposit: bigint; maxDeposit: bigint; earlyWithdrawPenaltyBps: bigint; enabled: boolean }`
  - `useIsOwner() → boolean`
  - `useDeposits() → { deposits: DepositRaw[]; isLoading; refetch: () => void }`

- [ ] **Step 1: useSystemState**

Create `frontend/src/hooks/useSystemState.ts`:

```ts
import { useAccount, useReadContracts } from 'wagmi'
import { savingCoreAbi, vaultManagerAbi } from '../generated'
import { getAddress } from '../config/contracts'

export function useSystemState() {
  const { chainId } = useAccount()
  const core = chainId ? getAddress('SavingCore', chainId) : undefined
  const vault = chainId ? getAddress('VaultManager', chainId) : undefined
  const enabled = !!core && !!vault

  const { data } = useReadContracts({
    query: { enabled },
    contracts: [
      { address: core, abi: savingCoreAbi, functionName: 'owner' },
      { address: core, abi: savingCoreAbi, functionName: 'paused' },
      { address: core, abi: savingCoreAbi, functionName: 'GRACE_PERIOD' },
      { address: core, abi: savingCoreAbi, functionName: 'keeperRewardBps' },
      { address: vault, abi: vaultManagerAbi, functionName: 'feeReceiver' },
      { address: vault, abi: vaultManagerAbi, functionName: 'vaultBalance' },
      { address: vault, abi: vaultManagerAbi, functionName: 'paused' },
    ],
  })

  return {
    owner: data?.[0]?.result as `0x${string}` | undefined,
    corePaused: (data?.[1]?.result as boolean) ?? false,
    gracePeriod: (data?.[2]?.result as bigint) ?? 259200n,
    keeperRewardBps: (data?.[3]?.result as bigint) ?? 0n,
    feeReceiver: data?.[4]?.result as `0x${string}` | undefined,
    vaultBalance: (data?.[5]?.result as bigint) ?? 0n,
    vaultPaused: (data?.[6]?.result as boolean) ?? false,
  }
}
```

- [ ] **Step 2: usePlans**

Create `frontend/src/hooks/usePlans.ts`:

```ts
import { useAccount, useReadContract, useReadContracts } from 'wagmi'
import { savingCoreAbi } from '../generated'
import { getAddress } from '../config/contracts'

export type Plan = {
  planId: bigint
  tenorDays: bigint
  aprBps: bigint
  minDeposit: bigint
  maxDeposit: bigint
  earlyWithdrawPenaltyBps: bigint
  enabled: boolean
}

export function usePlans() {
  const { chainId } = useAccount()
  const core = chainId ? getAddress('SavingCore', chainId) : undefined

  const { data: count } = useReadContract({
    address: core, abi: savingCoreAbi, functionName: 'planCount',
    query: { enabled: !!core },
  })
  const n = count ? Number(count) : 0

  const { data, isLoading } = useReadContracts({
    query: { enabled: !!core && n > 0 },
    contracts: Array.from({ length: n }, (_, i) => ({
      address: core, abi: savingCoreAbi, functionName: 'plans', args: [BigInt(i)],
    })),
  })

  const plans: Plan[] = (data ?? []).map((r, i) => {
    const p = r.result as {
      tenorDays: bigint; aprBps: bigint; minDeposit: bigint; maxDeposit: bigint
      earlyWithdrawPenaltyBps: bigint; enabled: boolean
    }
    return { planId: BigInt(i), ...p }
  })

  return { plans, isLoading }
}
```

- [ ] **Step 3: useIsOwner**

Create `frontend/src/hooks/useIsOwner.ts`:

```ts
import { useAccount } from 'wagmi'
import { useSystemState } from './useSystemState'

export function useIsOwner(): boolean {
  const { address } = useAccount()
  const { owner } = useSystemState()
  return !!address && !!owner && address.toLowerCase() === owner.toLowerCase()
}
```

- [ ] **Step 4: useDeposits (client-side enumeration)**

Create `frontend/src/hooks/useDeposits.ts`:

```ts
import { useAccount, usePublicClient, useReadContracts } from 'wagmi'
import { useQuery } from '@tanstack/react-query'
import { savingCoreAbi } from '../generated'
import { getAddress, deployFromBlock } from '../config/contracts'
import type { DepositRaw } from '../lib/deposit'

export function useDeposits() {
  const { address, chainId } = useAccount()
  const client = usePublicClient()
  const core = chainId ? getAddress('SavingCore', chainId) : undefined

  // 1) find candidate depositIds from DepositOpened logs (owner arg is not indexed → filter client-side)
  const idsQuery = useQuery({
    queryKey: ['depositIds', chainId, address, core],
    enabled: !!client && !!core && !!address,
    queryFn: async () => {
      const logs = await client!.getContractEvents({
        address: core!, abi: savingCoreAbi, eventName: 'DepositOpened',
        fromBlock: deployFromBlock(chainId!), toBlock: 'latest',
      })
      const ids = new Set<bigint>()
      for (const log of logs) {
        const a = log.args as { depositId?: bigint; owner?: `0x${string}` }
        if (a.owner && a.depositId !== undefined && a.owner.toLowerCase() === address!.toLowerCase()) {
          ids.add(a.depositId)
        }
      }
      return [...ids]
    },
  })
  const ids = idsQuery.data ?? []

  // 2) read current owner + struct for each candidate; keep those still owned by the user
  const { data, isLoading, refetch } = useReadContracts({
    query: { enabled: ids.length > 0 },
    contracts: ids.flatMap((id) => [
      { address: core, abi: savingCoreAbi, functionName: 'ownerOf', args: [id] } as const,
      { address: core, abi: savingCoreAbi, functionName: 'deposits', args: [id] } as const,
    ]),
  })

  const deposits: DepositRaw[] = []
  if (data) {
    for (let i = 0; i < ids.length; i++) {
      const owner = data[i * 2]?.result as `0x${string}` | undefined
      const d = data[i * 2 + 1]?.result as {
        planId: bigint; principal: bigint; startAt: bigint; maturityAt: bigint
        aprBpsAtOpen: bigint; penaltyBpsAtOpen: bigint; tenorDaysAtOpen: bigint
        status: number; pendingInterest: bigint
      } | undefined
      if (owner && d && owner.toLowerCase() === address!.toLowerCase()) {
        deposits.push({ depositId: ids[i], ...d })
      }
    }
  }

  return {
    deposits,
    isLoading: idsQuery.isLoading || isLoading,
    refetch: () => { idsQuery.refetch(); refetch() },
  }
}
```

- [ ] **Step 5: Wire Admin tab visibility**

In `frontend/src/App.tsx`, replace `const showAdmin = false` with:

```tsx
import { useIsOwner } from './hooks/useIsOwner'
// ...inside App():
const showAdmin = useIsOwner()
```
(Add the import at the top; keep the rest of App as-is for now.)

- [ ] **Step 6: Verify build + a read-path smoke against the local node**

Run: `npm run build`
Expected: success.

Then verify the generated wiring actually reads from the running local node (no wallet needed). This script reads the ABI **and** address straight from the deployment JSON (no TS import), so it stays robust:

Create `frontend/scripts/smoke-read.mjs`:

```js
import { createPublicClient, http } from 'viem'
import { readFileSync } from 'node:fs'

const dep = JSON.parse(readFileSync('../hardhat-temp/deployments/localhost/SavingCore.json', 'utf8'))
const client = createPublicClient({ transport: http('http://127.0.0.1:8545') })
const count = await client.readContract({ address: dep.address, abi: dep.abi, functionName: 'planCount' })
console.log('planCount =', count)
if (count < 1n) throw new Error('expected at least the default plan')
```

Run: `node scripts/smoke-read.mjs`
Expected: `planCount = 1n` (the default plan created by the deploy). This proves the local node + deployed addresses are reachable with the same ABI the app uses. Delete the script after: `rm scripts/smoke-read.mjs`.

- [ ] **Step 7: Commit**

```bash
cd /home/khangia/capstone
git add frontend/src/hooks frontend/src/App.tsx
git commit -m "feat(frontend): data hooks (system state, plans, owner, deposit enumeration)"
```

---

### Task 8: TxButton + PlansView + OpenDepositDialog

**Files:**
- Create: `frontend/src/components/TxButton.tsx`, `PlansView.tsx`, `OpenDepositDialog.tsx`.
- Modify: `frontend/src/App.tsx` (render PlansView on the Deposit tab).

**Interfaces:**
- Consumes: `usePlans`, `useSystemState`, `getAddress`, `savingCoreAbi`, `mockUsdcAbi`, `decodeRevert`, `formatUsdc`, `parseUsdc`, `bpsToPercent`.
- Produces: `TxButton` (props below), `PlansView`, `OpenDepositDialog`.

- [ ] **Step 1: TxButton (shared write wrapper)**

Create `frontend/src/components/TxButton.tsx`:

```tsx
import { useEffect } from 'react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import type { Abi } from 'viem'
import { toast } from 'sonner'
import { decodeRevert } from '../lib/errors'

export function TxButton({ label, address, abi, functionName, args, value, disabled, onConfirmed, className }: {
  label: string
  address?: `0x${string}`
  abi: Abi
  functionName: string
  args?: readonly unknown[]
  value?: bigint
  disabled?: boolean
  onConfirmed?: () => void
  className?: string
}) {
  const { writeContract, data: hash, isPending, reset } = useWriteContract()
  const { isLoading: mining, isSuccess } = useWaitForTransactionReceipt({ hash })

  useEffect(() => {
    if (isSuccess) { toast.success(`${label} confirmed`); onConfirmed?.(); reset() }
  }, [isSuccess]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <button
      disabled={disabled || isPending || mining || !address}
      onClick={() =>
        // `abi`/`functionName` are dynamic here, so writeContract's per-call generics
        // can't be inferred; cast the variables object to satisfy the wrapper.
        writeContract(
          { address: address!, abi, functionName, args, value } as Parameters<typeof writeContract>[0],
          { onError: (e) => toast.error(decodeRevert(e)) },
        )
      }
      className={className ?? 'px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-sm'}
    >
      {isPending || mining ? 'Confirming…' : label}
    </button>
  )
}
```

- [ ] **Step 2: OpenDepositDialog (two-step approve → openDeposit)**

Create `frontend/src/components/OpenDepositDialog.tsx`:

```tsx
import { useState } from 'react'
import { useAccount, useReadContract } from 'wagmi'
import { savingCoreAbi, mockUsdcAbi } from '../generated'
import { getAddress } from '../config/contracts'
import { formatUsdc, parseUsdc } from '../lib/format'
import { quoteInterest } from '../lib/deposit'
import { TxButton } from './TxButton'
import type { Plan } from '../hooks/usePlans'

export function OpenDepositDialog({ plan, onClose, onDone }: { plan: Plan; onClose: () => void; onDone: () => void }) {
  const { address, chainId } = useAccount()
  const core = chainId ? getAddress('SavingCore', chainId) : undefined
  const usdc = chainId ? getAddress('MockUSDC', chainId) : undefined
  const [amountStr, setAmountStr] = useState('1000')

  let amount = 0n
  try { amount = parseUsdc(amountStr || '0') } catch { amount = 0n }

  const { data: balance } = useReadContract({ address: usdc, abi: mockUsdcAbi, functionName: 'balanceOf', args: address ? [address] : undefined, query: { enabled: !!usdc && !!address } })
  const { data: allowance, refetch: refetchAllowance } = useReadContract({ address: usdc, abi: mockUsdcAbi, functionName: 'allowance', args: address && core ? [address, core] : undefined, query: { enabled: !!usdc && !!address && !!core } })

  const belowMin = plan.minDeposit > 0n && amount < plan.minDeposit
  const aboveMax = plan.maxDeposit > 0n && amount > plan.maxDeposit
  const needsApproval = (allowance ?? 0n) < amount
  const amountValid = amount > 0n && !belowMin && !aboveMax

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-96 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold">Open deposit — plan #{plan.planId.toString()}</h3>
        <div className="text-xs text-slate-400">
          Balance: {balance !== undefined ? formatUsdc(balance as bigint) : '—'} USDC
          {plan.minDeposit > 0n && <> · min {formatUsdc(plan.minDeposit)}</>}
          {plan.maxDeposit > 0n && <> · max {formatUsdc(plan.maxDeposit)}</>}
        </div>
        <input value={amountStr} onChange={(e) => setAmountStr(e.target.value)} inputMode="decimal"
          className="w-full bg-slate-800 rounded-md px-3 py-2 outline-none" placeholder="Amount (USDC)" />
        {amount > 0n && (
          <p className="text-xs text-slate-400">
            Est. interest at maturity: {formatUsdc(quoteInterest(amount, plan.aprBps, plan.tenorDays))} USDC
            {' '}(over {plan.tenorDays.toString()} days at {(Number(plan.aprBps) / 100)}% APR)
          </p>
        )}
        {belowMin && <p className="text-xs text-red-400">Below plan minimum.</p>}
        {aboveMax && <p className="text-xs text-red-400">Above plan maximum.</p>}
        <div className="flex gap-2 justify-end">
          {needsApproval ? (
            <TxButton label="Approve" address={usdc} abi={mockUsdcAbi} functionName="approve"
              args={core ? [core, amount] : undefined} disabled={!amountValid || !core}
              onConfirmed={() => refetchAllowance()} />
          ) : (
            <TxButton label="Open deposit" address={core} abi={savingCoreAbi} functionName="openDeposit"
              args={[plan.planId, amount]} disabled={!amountValid}
              onConfirmed={() => { onDone(); onClose() }} />
          )}
          <button onClick={onClose} className="px-3 py-1.5 rounded-md bg-slate-700 text-sm">Cancel</button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: PlansView**

Create `frontend/src/components/PlansView.tsx`:

```tsx
import { useState } from 'react'
import { usePlans, type Plan } from '../hooks/usePlans'
import { useSystemState } from '../hooks/useSystemState'
import { bpsToPercent, formatUsdc } from '../lib/format'
import { OpenDepositDialog } from './OpenDepositDialog'

export function PlansView({ onOpened }: { onOpened: () => void }) {
  const { plans, isLoading } = usePlans()
  const { corePaused } = useSystemState()
  const [selected, setSelected] = useState<Plan | null>(null)

  if (isLoading) return <div className="text-slate-400">Loading plans…</div>
  if (plans.length === 0) return <div className="text-slate-400">No plans yet.</div>

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {plans.map((p) => (
        <div key={p.planId.toString()} className="border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-medium">Plan #{p.planId.toString()}</span>
            <span className={`text-xs px-2 py-0.5 rounded ${p.enabled ? 'bg-emerald-600/30 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>
              {p.enabled ? 'enabled' : 'disabled'}
            </span>
          </div>
          <dl className="text-sm text-slate-300 space-y-1">
            <div className="flex justify-between"><dt className="text-slate-500">Tenor</dt><dd>{p.tenorDays.toString()} days</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">APR</dt><dd>{bpsToPercent(p.aprBps)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Penalty</dt><dd>{bpsToPercent(p.earlyWithdrawPenaltyBps)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Min / Max</dt><dd>{p.minDeposit === 0n ? '—' : formatUsdc(p.minDeposit)} / {p.maxDeposit === 0n ? '—' : formatUsdc(p.maxDeposit)}</dd></div>
          </dl>
          <button disabled={!p.enabled || corePaused} onClick={() => setSelected(p)}
            className="w-full mt-2 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-sm">
            Open deposit
          </button>
        </div>
      ))}
      {selected && <OpenDepositDialog plan={selected} onClose={() => setSelected(null)} onDone={onOpened} />}
    </div>
  )
}
```

- [ ] **Step 4: Render PlansView on the Deposit tab**

In `frontend/src/App.tsx`, import and render it, and add a `useQueryClient` refresh. Replace the `<main>` body:

```tsx
import { useQueryClient } from '@tanstack/react-query'
import { PlansView } from './components/PlansView'
// ...inside App():
const queryClient = useQueryClient()
const refreshAll = () => queryClient.invalidateQueries()
// ...
<main className="max-w-5xl mx-auto px-6 py-6 space-y-4">
  <ChainGuard />
  {tab === 'deposit' && <PlansView onOpened={refreshAll} />}
  {tab === 'my' && <div className="text-slate-400">My Deposits — Task 9.</div>}
  {tab === 'admin' && showAdmin && <div className="text-slate-400">Admin — Task 10.</div>}
</main>
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: success. Manual smoke (user, during demo): connect MetaMask on 31337, mint USDC via Admin later, open a deposit — the approve→open flow works and the deposit appears after refresh.

- [ ] **Step 6: Commit**

```bash
cd /home/khangia/capstone
git add frontend/src/components frontend/src/App.tsx
git commit -m "feat(frontend): plans view + open-deposit approve/open flow + TxButton"
```

---

### Task 9: MyDeposits + DepositRow + RenewDialog

**Files:**
- Create: `frontend/src/components/MyDeposits.tsx`, `DepositRow.tsx`, `RenewDialog.tsx`.
- Modify: `frontend/src/App.tsx` (render MyDeposits on the My tab).

**Interfaces:**
- Consumes: `useDeposits`, `usePlans`, `useSystemState`, `deriveDepositView`, `savingCoreAbi`, `getAddress`, `formatUsdc`, `bpsToPercent`, `formatCountdown`, `TxButton`.
- Produces: `MyDeposits`, `DepositRow`, `RenewDialog`.

- [ ] **Step 1: RenewDialog**

Create `frontend/src/components/RenewDialog.tsx`:

```tsx
import { useState } from 'react'
import { useAccount } from 'wagmi'
import { savingCoreAbi } from '../generated'
import { getAddress } from '../config/contracts'
import { usePlans } from '../hooks/usePlans'
import { bpsToPercent } from '../lib/format'
import { TxButton } from './TxButton'

export function RenewDialog({ depositId, onClose, onDone }: { depositId: bigint; onClose: () => void; onDone: () => void }) {
  const { chainId } = useAccount()
  const core = chainId ? getAddress('SavingCore', chainId) : undefined
  const { plans } = usePlans()
  const enabledPlans = plans.filter((p) => p.enabled)
  const [planId, setPlanId] = useState<bigint | null>(enabledPlans[0]?.planId ?? null)

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-96 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold">Renew deposit #{depositId.toString()}</h3>
        <p className="text-xs text-slate-400">Interest is compounded into the new principal; the new deposit uses the chosen plan's current rate.</p>
        <select className="w-full bg-slate-800 rounded-md px-3 py-2"
          value={planId?.toString() ?? ''} onChange={(e) => setPlanId(BigInt(e.target.value))}>
          {enabledPlans.map((p) => (
            <option key={p.planId.toString()} value={p.planId.toString()}>
              Plan #{p.planId.toString()} — {p.tenorDays.toString()}d @ {bpsToPercent(p.aprBps)}
            </option>
          ))}
        </select>
        <div className="flex gap-2 justify-end">
          <TxButton label="Renew" address={core} abi={savingCoreAbi} functionName="renewDeposit"
            args={planId !== null ? [depositId, planId] : undefined} disabled={planId === null}
            onConfirmed={() => { onDone(); onClose() }} />
          <button onClick={onClose} className="px-3 py-1.5 rounded-md bg-slate-700 text-sm">Cancel</button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: DepositRow**

Create `frontend/src/components/DepositRow.tsx`:

```tsx
import { useState } from 'react'
import { useAccount } from 'wagmi'
import { savingCoreAbi } from '../generated'
import { getAddress } from '../config/contracts'
import { deriveDepositView, type DepositRaw } from '../lib/deposit'
import { formatUsdc, bpsToPercent, formatCountdown } from '../lib/format'
import { TxButton } from './TxButton'
import { RenewDialog } from './RenewDialog'

export function DepositRow({ d, nowSecs, gracePeriod, systemPaused, onChanged }: {
  d: DepositRaw; nowSecs: number; gracePeriod: number; systemPaused: boolean; onChanged: () => void
}) {
  const { chainId } = useAccount()
  const core = chainId ? getAddress('SavingCore', chainId) : undefined
  const v = deriveDepositView(d, nowSecs, gracePeriod, systemPaused)
  const [renewing, setRenewing] = useState(false)

  const timing = v.isActive
    ? v.isMatured
      ? (v.isPastGrace ? 'past grace' : `grace ends in ${formatCountdown(v.secondsToGraceEnd)}`)
      : `matures in ${formatCountdown(v.secondsToMaturity)}`
    : '—'

  return (
    <tr className="border-t border-slate-800">
      <td className="py-2 px-3">#{d.depositId.toString()}</td>
      <td className="px-3">{formatUsdc(d.principal)} USDC</td>
      <td className="px-3">{bpsToPercent(d.aprBpsAtOpen)}</td>
      <td className="px-3">{v.statusLabel}</td>
      <td className="px-3 text-slate-400">{timing}</td>
      <td className="px-3">{v.hasPendingInterest ? `${formatUsdc(d.pendingInterest)} USDC` : '—'}</td>
      <td className="px-3">
        <div className="flex gap-2 flex-wrap justify-end">
          {v.actions.withdrawAtMaturity && <TxButton label="Withdraw" address={core} abi={savingCoreAbi} functionName="withdrawAtMaturity" args={[d.depositId]} onConfirmed={onChanged} />}
          {v.actions.earlyWithdraw && <TxButton label="Early withdraw" address={core} abi={savingCoreAbi} functionName="earlyWithdraw" args={[d.depositId]} onConfirmed={onChanged} className="px-3 py-1.5 rounded-md bg-amber-700 hover:bg-amber-600 text-sm" />}
          {v.actions.renew && <button onClick={() => setRenewing(true)} className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-sm">Renew</button>}
          {v.actions.autoRenew && <TxButton label="Auto-renew" address={core} abi={savingCoreAbi} functionName="autoRenewDeposit" args={[d.depositId]} onConfirmed={onChanged} />}
          {v.actions.claimInterest && <TxButton label="Claim interest" address={core} abi={savingCoreAbi} functionName="claimInterest" args={[d.depositId]} onConfirmed={onChanged} className="px-3 py-1.5 rounded-md bg-emerald-700 hover:bg-emerald-600 text-sm" />}
        </div>
        {renewing && <RenewDialog depositId={d.depositId} onClose={() => setRenewing(false)} onDone={onChanged} />}
      </td>
    </tr>
  )
}
```

- [ ] **Step 3: MyDeposits**

Create `frontend/src/components/MyDeposits.tsx`:

```tsx
import { useAccount } from 'wagmi'
import { useDeposits } from '../hooks/useDeposits'
import { useSystemState } from '../hooks/useSystemState'
import { DepositRow } from './DepositRow'

export function MyDeposits({ onChanged }: { onChanged: () => void }) {
  const { isConnected } = useAccount()
  const { deposits, isLoading } = useDeposits()
  const { gracePeriod, corePaused } = useSystemState()
  const now = Math.floor(Date.now() / 1000)

  if (!isConnected) return <div className="text-slate-400">Connect a wallet to see your deposits.</div>
  if (isLoading) return <div className="text-slate-400">Loading your deposits…</div>
  if (deposits.length === 0) return <div className="text-slate-400">You have no deposits yet.</div>

  return (
    <table className="w-full text-sm">
      <thead className="text-slate-500 text-left">
        <tr>
          <th className="py-2 px-3">ID</th><th className="px-3">Principal</th><th className="px-3">APR</th>
          <th className="px-3">Status</th><th className="px-3">Timing</th><th className="px-3">Pending</th><th className="px-3 text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        {deposits.map((d) => (
          <DepositRow key={d.depositId.toString()} d={d} nowSecs={now}
            gracePeriod={Number(gracePeriod)} systemPaused={corePaused} onChanged={onChanged} />
        ))}
      </tbody>
    </table>
  )
}
```

- [ ] **Step 4: Render on the My tab**

In `frontend/src/App.tsx`, replace the `tab === 'my'` line:

```tsx
import { MyDeposits } from './components/MyDeposits'
// ...
{tab === 'my' && <MyDeposits onChanged={refreshAll} />}
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: success. Manual smoke (user): after opening a deposit, the My Deposits tab lists it with the right status/countdown; fast-forwarding the local chain (`npx hardhat console` → `network.provider.send("evm_increaseTime", …)`) surfaces Withdraw/Renew/Auto-renew appropriately.

- [ ] **Step 6: Commit**

```bash
cd /home/khangia/capstone
git add frontend/src/components frontend/src/App.tsx
git commit -m "feat(frontend): my-deposits table with withdraw/early/renew/claim/auto-renew"
```

---

### Task 10: AdminPanel (owner-only)

**Files:**
- Create: `frontend/src/components/AdminPanel.tsx`.
- Modify: `frontend/src/App.tsx` (render AdminPanel on the Admin tab).

**Interfaces:**
- Consumes: `useSystemState`, `useAccount`, `savingCoreAbi`, `vaultManagerAbi`, `mockUsdcAbi`, `getAddress`, `formatUsdc`, `parseUsdc`, `TxButton`.
- Produces: `AdminPanel`.

- [ ] **Step 1: AdminPanel**

Create `frontend/src/components/AdminPanel.tsx`:

```tsx
import { useState } from 'react'
import { useAccount, useReadContract } from 'wagmi'
import { savingCoreAbi, vaultManagerAbi, mockUsdcAbi } from '../generated'
import { getAddress } from '../config/contracts'
import { useSystemState } from '../hooks/useSystemState'
import { formatUsdc, parseUsdc } from '../lib/format'
import { TxButton } from './TxButton'

const box = 'border border-slate-800 rounded-xl p-4 space-y-3'
const input = 'w-full bg-slate-800 rounded-md px-3 py-2 outline-none text-sm'

export function AdminPanel({ onChanged }: { onChanged: () => void }) {
  const { address, chainId } = useAccount()
  const core = chainId ? getAddress('SavingCore', chainId) : undefined
  const vault = chainId ? getAddress('VaultManager', chainId) : undefined
  const usdc = chainId ? getAddress('MockUSDC', chainId) : undefined
  const { vaultBalance, feeReceiver, keeperRewardBps, corePaused, vaultPaused } = useSystemState()

  // createPlan form (pre-filled to personal-variant defaults)
  const [tenor, setTenor] = useState('180')
  const [apr, setApr] = useState('225')
  const [minD, setMinD] = useState('0')
  const [maxD, setMaxD] = useState('0')
  const [pen, setPen] = useState('550')
  // vault + config forms
  const [fund, setFund] = useState('100000')
  const [sched, setSched] = useState('0')
  const [fee, setFee] = useState('')
  const [keeper, setKeeper] = useState('50')
  const [mintTo, setMintTo] = useState(address ?? '')
  const [mintAmt, setMintAmt] = useState('10000')

  const { data: vaultAllowance, refetch: refetchVaultAllowance } = useReadContract({
    address: usdc, abi: mockUsdcAbi, functionName: 'allowance',
    args: address && vault ? [address, vault] : undefined, query: { enabled: !!usdc && !!address && !!vault },
  })
  const fundAmount = (() => { try { return parseUsdc(fund || '0') } catch { return 0n } })()
  const needsVaultApproval = (vaultAllowance ?? 0n) < fundAmount

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={box}>
        <h3 className="font-semibold">Create plan</h3>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-slate-400">Tenor (days)<input className={input} value={tenor} onChange={(e) => setTenor(e.target.value)} /></label>
          <label className="text-xs text-slate-400">APR (bps)<input className={input} value={apr} onChange={(e) => setApr(e.target.value)} /></label>
          <label className="text-xs text-slate-400">Min (USDC)<input className={input} value={minD} onChange={(e) => setMinD(e.target.value)} /></label>
          <label className="text-xs text-slate-400">Max (USDC)<input className={input} value={maxD} onChange={(e) => setMaxD(e.target.value)} /></label>
          <label className="text-xs text-slate-400">Penalty (bps)<input className={input} value={pen} onChange={(e) => setPen(e.target.value)} /></label>
        </div>
        <TxButton label="Create plan" address={core} abi={savingCoreAbi} functionName="createPlan"
          args={[BigInt(tenor || '0'), BigInt(apr || '0'), parseUsdc(minD || '0'), parseUsdc(maxD || '0'), BigInt(pen || '0')]}
          onConfirmed={onChanged} />
      </div>

      <div className={box}>
        <h3 className="font-semibold">Vault — balance {formatUsdc(vaultBalance)} USDC</h3>
        <div className="flex gap-2 items-center">
          <input className={input} value={fund} onChange={(e) => setFund(e.target.value)} placeholder="Fund amount (USDC)" />
          {needsVaultApproval
            ? <TxButton label="Approve" address={usdc} abi={mockUsdcAbi} functionName="approve" args={vault ? [vault, fundAmount] : undefined} onConfirmed={() => refetchVaultAllowance()} />
            : <TxButton label="Fund" address={vault} abi={vaultManagerAbi} functionName="fundVault" args={[fundAmount]} onConfirmed={onChanged} />}
        </div>
        <h4 className="text-sm text-slate-400 pt-2">Timelocked withdrawal (2-day delay)</h4>
        <div className="flex gap-2 items-center">
          <input className={input} value={sched} onChange={(e) => setSched(e.target.value)} placeholder="Amount (USDC)" />
          <TxButton label="Schedule" address={vault} abi={vaultManagerAbi} functionName="scheduleWithdrawVault" args={[parseUsdc(sched || '0')]} onConfirmed={onChanged} />
        </div>
        <div className="flex gap-2">
          <TxButton label="Execute" address={vault} abi={vaultManagerAbi} functionName="executeWithdrawVault" onConfirmed={onChanged} />
          <TxButton label="Cancel" address={vault} abi={vaultManagerAbi} functionName="cancelScheduledWithdrawal" onConfirmed={onChanged} className="px-3 py-1.5 rounded-md bg-slate-700 text-sm" />
        </div>
      </div>

      <div className={box}>
        <h3 className="font-semibold">Config</h3>
        <p className="text-xs text-slate-400">Fee receiver: {feeReceiver ?? '—'} · keeper reward: {keeperRewardBps.toString()} bps</p>
        <div className="flex gap-2"><input className={input} value={fee} onChange={(e) => setFee(e.target.value)} placeholder="New fee receiver (0x…)" />
          <TxButton label="Set fee" address={vault} abi={vaultManagerAbi} functionName="setFeeReceiver" args={fee ? [fee as `0x${string}`] : undefined} disabled={!fee} onConfirmed={onChanged} /></div>
        <div className="flex gap-2"><input className={input} value={keeper} onChange={(e) => setKeeper(e.target.value)} placeholder="Keeper reward (bps)" />
          <TxButton label="Set keeper" address={core} abi={savingCoreAbi} functionName="setKeeperRewardBps" args={[BigInt(keeper || '0')]} onConfirmed={onChanged} /></div>
      </div>

      <div className={box}>
        <h3 className="font-semibold">Emergency & demo</h3>
        <div className="flex gap-2">
          <TxButton label={corePaused ? 'Unpause core' : 'Pause core'} address={core} abi={savingCoreAbi} functionName={corePaused ? 'unpause' : 'pause'} onConfirmed={onChanged} className="px-3 py-1.5 rounded-md bg-rose-700 hover:bg-rose-600 text-sm" />
          <TxButton label={vaultPaused ? 'Unpause vault' : 'Pause vault'} address={vault} abi={vaultManagerAbi} functionName={vaultPaused ? 'unpause' : 'pause'} onConfirmed={onChanged} className="px-3 py-1.5 rounded-md bg-rose-700 hover:bg-rose-600 text-sm" />
        </div>
        <h4 className="text-sm text-slate-400 pt-2">Mint MockUSDC (demo)</h4>
        <div className="grid grid-cols-2 gap-2">
          <input className={input} value={mintTo} onChange={(e) => setMintTo(e.target.value)} placeholder="To (0x…)" />
          <input className={input} value={mintAmt} onChange={(e) => setMintAmt(e.target.value)} placeholder="Amount (USDC)" />
        </div>
        <TxButton label="Mint" address={usdc} abi={mockUsdcAbi} functionName="mint" args={mintTo ? [mintTo as `0x${string}`, parseUsdc(mintAmt || '0')] : undefined} disabled={!mintTo} onConfirmed={onChanged} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Render on the Admin tab**

In `frontend/src/App.tsx`, replace the `tab === 'admin'` line:

```tsx
import { AdminPanel } from './components/AdminPanel'
// ...
{tab === 'admin' && showAdmin && <AdminPanel onChanged={refreshAll} />}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: success. Manual smoke (user, as the owner account): mint USDC to a test address, fund the vault, create a plan, schedule/execute a timelock withdrawal after advancing time, toggle pause.

- [ ] **Step 4: Commit**

```bash
cd /home/khangia/capstone
git add frontend/src/components/AdminPanel.tsx frontend/src/App.tsx
git commit -m "feat(frontend): owner-only admin panel (plans, vault, timelock, config, mint)"
```

---

### Task 11: Deploy to Sepolia + multi-chain wiring

**Files:**
- Produce (outside frontend): `hardhat-temp/deployments/sepolia/{MockUSDC,VaultManager,SavingCore}.json`.
- Modify (regenerate): `frontend/src/generated.ts`, `frontend/src/config/deployBlocks.json`.

**Interfaces:**
- Consumes: `wagmi.config.ts`'s `addressesFor()` and `scripts/sync-deploy-blocks.mjs` (both already handle Sepolia — they simply skip it while no deployment exists).
- Produces: Sepolia entries (`11155111`) in the generated address maps and in `deployBlocks.json`, making the app fully functional on Sepolia.

**IMPORTANT — this task needs user-supplied secrets and funds and cannot be completed autonomously.** It requires a deployer private key holding Sepolia ETH. If `hardhat-temp/.env` has no funded `TESTNET_PRIVATE_KEY`, **stop and report NEEDS_CONTEXT** rather than inventing a key, committing a key, or skipping the task silently. Never print a private key into logs, reports, or commits.

- [ ] **Step 1: Confirm prerequisites**

```bash
cd /home/khangia/capstone/hardhat-temp
# Verify a testnet key is configured WITHOUT printing it:
node -e "require('dotenv').config();console.log('TESTNET_PRIVATE_KEY set:', !!process.env.TESTNET_PRIVATE_KEY)"
```
Expected: `TESTNET_PRIVATE_KEY set: true`. If `false`, STOP and report NEEDS_CONTEXT: the user must put a faucet-funded Sepolia key in `hardhat-temp/.env` (the repo's `.gitignore` already excludes `.env`).

Also confirm the deployer has a balance:

```bash
npx hardhat run --network sepolia --no-compile <(echo '
const [s] = await ethers.getSigners();
console.log("deployer:", s.address, "balance(wei):", (await ethers.provider.getBalance(s.address)).toString());
')
```
Expected: a non-zero balance. If zero, STOP and report NEEDS_CONTEXT (user must use a Sepolia faucet).

- [ ] **Step 2: Deploy to Sepolia**

```bash
cd /home/khangia/capstone/hardhat-temp
npx hardhat deploy --network sepolia
```
Expected: the three addresses print; `deployments/sepolia/MockUSDC.json`, `VaultManager.json`, `SavingCore.json` now exist, each with `address`, `abi`, and `receipt.blockNumber`. The script's idempotency guards also run `setSavingCore` once and create the default 180-day / 225-bps / 550-bps plan.

Sepolia is slower than local — allow several minutes. If a tx times out, re-run the command: `hardhat-deploy` reuses existing deployments and only completes what's missing.

- [ ] **Step 3: Verify the deployment wired itself correctly**

```bash
cd /home/khangia/capstone/hardhat-temp
npx hardhat run --network sepolia --no-compile <(echo '
const d = require("./deployments/sepolia/SavingCore.json");
const v = require("./deployments/sepolia/VaultManager.json");
const core = await ethers.getContractAt("SavingCore", d.address);
const vault = await ethers.getContractAt("VaultManager", v.address);
console.log("savingCore wired:", await vault.savingCore(), "expected:", d.address);
console.log("planCount:", (await core.planCount()).toString());
const p = await core.plans(0);
console.log("plan0 tenor/apr/penalty:", p.tenorDays.toString(), p.aprBps.toString(), p.earlyWithdrawPenaltyBps.toString());
')
```
Expected: `savingCore wired` equals the SavingCore address; `planCount: 1`; plan0 prints `180 225 550` (the personal-variant values).

- [ ] **Step 4: Regenerate frontend wiring for both chains**

```bash
cd /home/khangia/capstone/frontend
npm run codegen
```
Expected: the script prints `deployBlocks: { '31337': <n>, '11155111': <sepoliaBlock> }`, and `src/generated.ts` address maps now contain `11155111` entries. Confirm with `cat src/config/deployBlocks.json` — the Sepolia block must be the real (large) block number, not 0.

- [ ] **Step 5: Verify the build and the Sepolia read path**

Run: `npm run build`
Expected: success.

Then confirm the app's log-scan bound is usable on a public RPC. Create `frontend/scripts/smoke-sepolia.mjs`:

```js
import { createPublicClient, http } from 'viem'
import { sepolia } from 'viem/chains'
import { readFileSync } from 'node:fs'

const dep = JSON.parse(readFileSync('../hardhat-temp/deployments/sepolia/SavingCore.json', 'utf8'))
const blocks = JSON.parse(readFileSync('src/config/deployBlocks.json', 'utf8'))
const client = createPublicClient({ chain: sepolia, transport: http(process.env.VITE_SEPOLIA_RPC || undefined) })

const count = await client.readContract({ address: dep.address, abi: dep.abi, functionName: 'planCount' })
console.log('sepolia planCount =', count)

const logs = await client.getContractEvents({
  address: dep.address, abi: dep.abi, eventName: 'DepositOpened',
  fromBlock: BigInt(blocks['11155111']), toBlock: 'latest',
})
console.log('DepositOpened logs scanned OK, count =', logs.length)
```

Run: `node scripts/smoke-sepolia.mjs`
Expected: `sepolia planCount = 1n` and the log scan completes without an RPC range error (count may be 0 — no deposits yet; completing without error is the point). If the RPC rejects the range, that is the paging case noted in the spec — report it. Delete the script after: `rm scripts/smoke-sepolia.mjs`.

- [ ] **Step 6: Commit (no secrets)**

Before committing, confirm no key leaked: `git status --short` must not list `hardhat-temp/.env`, and `git diff --cached` must contain no private key.

```bash
cd /home/khangia/capstone
git add frontend/src/generated.ts frontend/src/config/deployBlocks.json hardhat-temp/deployments/sepolia
git commit -m "feat: deploy contracts to Sepolia and wire frontend for both chains"
```

Note: the Sepolia interest vault starts empty. To demo interest payouts there, use the Admin panel (mint MockUSDC → approve → fundVault) — this is a runtime action, not part of this task.

---

### Task 12: Frontend README + final integration pass

**Files:**
- Create: `frontend/README.md`.
- Modify: `frontend/src/App.tsx` (a not-connected empty state + paused banner), if not already present.

**Interfaces:**
- Produces: run instructions; a polished not-connected / paused state.

- [ ] **Step 1: Not-connected + paused banner in App**

In `frontend/src/App.tsx`, use `useAccount()` and `useSystemState()` so the body shows a connect prompt when disconnected and a paused banner when the core is paused. Final `<main>`:

```tsx
import { useAccount } from 'wagmi'
import { useSystemState } from './hooks/useSystemState'
// ...inside App():
const { isConnected } = useAccount()
const { corePaused } = useSystemState()
// ...
<main className="max-w-5xl mx-auto px-6 py-6 space-y-4">
  <ChainGuard />
  {corePaused && <div className="bg-rose-600/20 border border-rose-500 text-rose-200 px-4 py-2 rounded-md text-sm">System is paused — deposits and withdrawals are disabled.</div>}
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
```

- [ ] **Step 2: Frontend README**

Create `frontend/README.md`:

```markdown
# SavingCore dApp (frontend)

React + wagmi + RainbowKit UI for the SavingCore term-deposit contracts.

## Run locally (Hardhat)

1. In `../hardhat-temp/`: `npx hardhat node` (keep running).
2. In `../hardhat-temp/`: `npx hardhat deploy --network localhost`.
3. In this folder: `npm install`, then `npm run codegen` (only needed if you re-deployed to fresh addresses), then `npm run dev`.
4. In MetaMask: add network `http://127.0.0.1:8545` (chainId 31337), import a Hardhat test account. Use the Admin tab's Mint button to get MockUSDC.

## Sepolia

The app ships supporting Sepolia as well as local Hardhat.

1. Put a faucet-funded deployer key in `../hardhat-temp/.env` as `TESTNET_PRIVATE_KEY` (never commit it — `.env` is gitignored).
2. In `../hardhat-temp/`: `npx hardhat deploy --network sepolia`.
3. In this folder: `npm run codegen` (picks up the Sepolia addresses and the real deployment block automatically), then commit the regenerated `src/generated.ts` and `src/config/deployBlocks.json`.
4. Switch the wallet to Sepolia. The vault starts empty there — use the Admin tab (mint → approve → Fund vault) before demoing interest payouts.

If you connect to a supported chain before the contracts are deployed on it, the app shows a "Contracts are not deployed on this network yet" banner rather than an empty screen.

## Scripts

- `npm run dev` — dev server
- `npm run build` — typecheck + production build
- `npm test` — unit tests (format / deposit-logic / errors)
- `npm run codegen` — regenerate `src/generated.ts` **and** `src/config/deployBlocks.json` from the contract deployments (run after any deploy)

## Config

Copy `.env.example` to `.env`. `VITE_WC_PROJECT_ID` is optional (MetaMask works without it); `VITE_SEPOLIA_RPC` overrides the default Sepolia RPC.
```

- [ ] **Step 3: Verify build + tests**

Run: `npm run build && npm test`
Expected: build succeeds; all unit tests pass (format + deposit + errors).

- [ ] **Step 4: Commit**

```bash
cd /home/khangia/capstone
git add frontend/README.md frontend/src/App.tsx
git commit -m "feat(frontend): connect/paused states + run docs"
```

---

## Self-Review Notes (coverage of spec)

- Spec §1 stack → Task 1 (scaffold), Task 3 (wagmi/RainbowKit).
- Spec §2 layout → files created across Tasks 1–11 match the spec's tree.
- Spec §3 wiring / codegen / committed generated.ts → Task 2.
- Spec §4 chains & wallet, ChainGuard → Task 3.
- Spec §5.1 reads → Task 7 (useSystemState, usePlans, useIsOwner). §5.2 enumeration → Task 7 (useDeposits). §5.3 formatting → Task 4. §5.4 deriveDepositView → Task 5.
- Spec §6 screens → PlansView/OpenDepositDialog (Task 8), MyDeposits/DepositRow/RenewDialog (Task 9), AdminPanel (Task 10), Header (Task 3).
- Spec §7 flows (two-step approve, revert decode, refetch, guards) → Task 6 (errors), Task 8 (approve), TxButton refetch via `onConfirmed`+`invalidateQueries`, Task 11 (guards).
- Spec §8 testing → Tasks 4/5/6 Vitest units; manual smoke noted in Tasks 7–10.
- Spec §9 env → Task 3 `.env.example`.
- Spec §10.1 local run → Task 2 (deploy + codegen) + Task 12 README.
- Spec §10.2 Sepolia → **Task 11** (deploy, wiring verification, regenerated addresses + real deploy block, RPC range smoke) + Task 12 README.
- Spec §4 missing-deployment guard → Task 3 `useMissingDeployment` / second ChainGuard banner.
- Spec §5.2 real `fromBlock` → Task 2 `sync-deploy-blocks.mjs` + Task 3 `deployFromBlock`.

Open follow-ups for the executor:
- Keep one `hardhat node` running from Task 2 onward; deterministic local addresses keep `generated.ts` valid across restarts (re-deploy if the node was reset).
- wagmi's generated per-function hooks are not required; the plan deliberately uses wagmi's base `useReadContract(s)`/`useWriteContract` with the generated `*Abi`/`*Address` constants for stability.
- The open-deposit interest preview is computed client-side via `quoteInterest` (Task 5), not by calling the on-chain `previewInterest` (which needs an existing depositId). `quoteInterest` is unit-tested against both contract worked examples, so the quote and the eventual on-chain interest agree.
- `useReadContracts` over heterogeneous ABIs widens result types; the plan casts each `.result` explicitly (`as bigint`, etc.) — keep those casts, they are intentional, not laziness.
- Task 11 (Sepolia) depends on user-supplied secrets and faucet funds. It is ordered last among the build tasks on purpose: Tasks 1–10 deliver a fully working local dApp, so if the Sepolia key or funds never materialise, everything else still stands and only Task 11 is blocked. Report NEEDS_CONTEXT rather than faking or skipping it.
- Never commit `hardhat-temp/.env` or print a private key. `deployments/sepolia/*.json` contain only public data (addresses, ABIs, receipts) and are safe to commit.
