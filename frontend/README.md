# SavingCore dApp (frontend)

React + wagmi + RainbowKit UI for the SavingCore term-deposit contracts. Built with Vite 8, React 19, TypeScript 6, wagmi 2, viem 2, RainbowKit 2, TanStack Query v5, Tailwind v3, and sonner for toasts.

The app talks to two networks out of the box: a local Hardhat node (chain id `31337`) and Sepolia (chain id `11155111`, live and already deployed — see below).

## Personal-variant plan parameters

The default plan created at deploy time uses this student's assigned variant:

| Parameter | Value |
|---|---|
| Tenor | 180 days |
| APR | 225 bps (2.25%) |
| Early-withdraw penalty | 550 bps (5.50%) |
| Grace period (contract constant) | 3 days |

## Prerequisites

- Node.js and npm (dependencies are already installed in this checkout — do not run `npm install` unless you know you need to).
- MetaMask (or another injected wallet) for manual testing.
- The sibling `../hardhat-temp` project for running a local node / deploying.

## Run locally against Hardhat

1. In `../hardhat-temp/`: `npx hardhat node` (keep it running in its own terminal).
2. In `../hardhat-temp/`: `npx hardhat deploy --network localhost`.
3. In this folder (`frontend/`): `npm run dev`.
   - `npm run codegen` is only needed if you redeployed to fresh addresses (a brand-new node instance). It regenerates `src/generated.ts` and `src/config/deployBlocks.json` from the contract artifacts under `../hardhat-temp/deployments/`.
4. Open the printed local URL (Vite's default is `http://localhost:5173`).

### MetaMask setup for the local chain

1. Add a network: RPC URL `http://127.0.0.1:8545`, chain ID `31337`, currency symbol e.g. `ETH`.
2. Import one of the Hardhat node's default test accounts (the node prints its private keys on startup) so you have local ETH for gas.
3. Connect that account in the app, switch to tab **Admin** (visible only to the contracts' owner — the account that deployed them), and use **Mint** to send yourself MockUSDC. From there you can open deposits from the **Deposit** tab.

## Sepolia (already deployed — no setup needed to try it)

The contracts are already deployed and live on Sepolia; the app ships with their addresses and real deployment block baked into `src/generated.ts` and `src/config/deployBlocks.json`. To use it, just switch your wallet's network to Sepolia — no deploy or codegen step is required.

Live addresses (chain id `11155111`):

| Contract | Address |
|---|---|
| MockUSDC | `0x6AF827562ba95b8A3A4FFE743D88Df1532BB9aFd` |
| VaultManager | `0xe7350f158BCDdCA8E9124D229FA09286B90B1A82` |
| SavingCore | `0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c` |

**The Sepolia interest vault starts empty.** Deposits can be opened right away, but interest payouts will fail until the vault is funded. Before demoing interest/claim flows on Sepolia, connect as the owner account and, in the **Admin** tab: mint yourself MockUSDC, approve the vault, then **Fund vault**.

**Etherscan verification was not completed.** The `hardhat-verify` plugin installed in `hardhat-temp` targets Etherscan's V1 API, which Etherscan has since sunset in favor of V2 — running `hardhat verify` against it currently fails. The deployed bytecode is correct and functional; only the "Verified" badge on Etherscan is missing. This is a known limitation, not a functionality gap.

### Redeploying Sepolia yourself (optional)

Only needed if you want to deploy your own instance rather than use the addresses above.

1. Put a faucet-funded deployer key in `../hardhat-temp/.env` as `TESTNET_PRIVATE_KEY` (never commit it — `.env` is gitignored there).
2. In `../hardhat-temp/`: `npx hardhat deploy --network sepolia`.
3. In this folder: `npm run codegen` (picks up the new Sepolia addresses and the real deployment block automatically), then commit the regenerated `src/generated.ts` and `src/config/deployBlocks.json`.

If you connect to a supported chain before the contracts are deployed on it, the app shows a "Contracts are not deployed on this network yet" banner rather than an empty screen.

## Demoing time-based flows (read this before a live demo)

The UI does **not** use your machine's clock for maturity/grace-period gating. It reads the connected chain's **latest block timestamp** (via a watched `useBlock` call) and derives `now` from that, because the contracts themselves gate every time check on `block.timestamp`. This matters because:

- On Sepolia, block time tracks real wall-clock time, so waiting for the full 180-day tenor to demo naturally isn't practical.
- On the local Hardhat node, you can jump time forward instantly, and the UI's action buttons (Withdraw, Early withdraw, Renew, Auto-renew, Claim interest) will immediately reflect the new chain time on their next block/poll — no page reload needed.

To fast-forward the local chain, run this against the running node (e.g. in a Hardhat console attached to `--network localhost`, or via any JSON-RPC client):

```js
await network.provider.send("evm_increaseTime", [seconds]) // e.g. 180 * 86400 for the full tenor
await network.provider.send("evm_mine", [])
```

or the equivalent raw RPC calls (`evm_increaseTime`, then `evm_mine`) against `http://127.0.0.1:8545`.

Note: this local node's clock has already been advanced by roughly 200 days over the course of development, so deposits opened on it may already show as matured. That's expected and harmless. If you restart the Hardhat node, its clock resets to the current wall-clock time, and you must re-run `npx hardhat deploy --network localhost` followed by `npm run codegen` (the node also gets fresh addresses on restart).

## Scripts

- `npm run dev` — start the Vite dev server
- `npm run build` — typecheck (`tsc -b`) then production build
- `npm run preview` — preview the production build locally
- `npm test` — run the unit test suite (`vitest run`) covering `lib/format`, `lib/deposit`, `lib/errors`
- `npm run codegen` — regenerate `src/generated.ts` (via `wagmi generate`) **and** `src/config/deployBlocks.json` (via `scripts/sync-deploy-blocks.mjs`) from the contract deployments under `../hardhat-temp/deployments/`. Run after any (re)deploy.

## Config

Copy `.env.example` to `.env`. Both variables are optional:

- `VITE_WC_PROJECT_ID` — a WalletConnect Cloud project id. MetaMask (injected) works fine without it; without a project id, WalletConnect-based wallet options in RainbowKit's modal are limited.
- `VITE_SEPOLIA_RPC` — overrides the default public Sepolia RPC endpoint used by wagmi's transport.

## Feature tour

- **Deposit** tab (`PlansView` + `OpenDepositDialog`) — lists the plans created on-chain (tenor, APR, penalty, min/max), shows a live interest preview computed client-side (`quoteInterest`, unit-tested against the contract's own worked examples), and opens a deposit through the standard two-step ERC-20 approve → deposit flow.
- **My Deposits** tab (`MyDeposits` + `DepositRow`) — lists the connected wallet's deposits with live status (active / matured / past-grace / withdrawn) and exposes all five deposit actions where applicable: **Withdraw at maturity**, **Early withdraw** (with a confirmation dialog explaining the forfeited interest and penalty), **Renew** (opens a new deposit into a chosen plan), **Auto-renew** (permissionless — anyone can trigger it and earn the configured keeper reward), and **Claim interest**.
- **Admin** tab (`AdminPanel`, owner-only — hidden from the nav unless the connected account is the contracts' owner) — create plans, fund/schedule/execute/cancel a timelocked vault withdrawal, set the fee receiver and keeper reward, pause/unpause SavingCore and VaultManager independently, and mint MockUSDC for demo purposes.
- A **ChainGuard** banner warns when the connected wallet is on an unsupported network, or on a supported network where the contracts aren't deployed. A separate banner appears app-wide when the system is paused, and a connect-wallet prompt replaces the main content when no wallet is connected.
