# Online Banking System — Blockchain Term Deposit

Blockchain Programming — Final Project · **Student ID: K234141651**

A term-deposit ("bank savings account") protocol running entirely on smart contracts, plus a
React dApp. Users lock ERC-20 tokens into a saving plan for a fixed tenor, earn simple interest
paid from a separate bank-owned vault, and hold a transferable ERC-721 certificate. They can
withdraw at maturity, withdraw early (penalty, no interest), manually renew, or be auto-renewed
by a permissionless keeper after a grace period.

| | |
|---|---|
| **Contracts** | `MockUSDC` (6-decimal test ERC-20), `VaultManager` (interest pool), `SavingCore` (deposits + ERC-721 certificates) |
| **Tests** | 78 contract tests, 57 frontend tests — all passing |
| **Coverage** | MockUSDC 100%, VaultManager 100%, SavingCore 100% statements / 95.45% branches (requirement: >90%) |
| **Bonus challenges** | C1 (principal always safe), F (timelocked vault withdrawal), G (permissionless keeper) — all implemented and tested |
| **Networks** | Local Hardhat (`31337`) and Sepolia (`11155111`, already deployed) |

## Personal variant (assignment §8.1)

Student ID **K234141651** → `A` = 1 (last digit), `B` = 5 (second-to-last).

| Parameter | Formula | Value |
|---|---|---|
| Grace period (auto-renew) | `(A mod 3) + 2` | **3 days** |
| Default plan APR | `200 + A × 25` | **225 bps (2.25%)** |
| Early-withdraw penalty | `300 + B × 50` | **550 bps (5.50%)** |
| Default plan tenor | `B` is odd → 180 | **180 days** |

These exact values are used in the contracts, tests, deploy script, and demo.

## Repository layout

```
.
├── hardhat-temp/          # Smart contracts package (Hardhat + TypeScript)
│   ├── contracts/         # MockUSDC.sol, VaultManager.sol, SavingCore.sol
│   ├── test/              # 78 tests
│   ├── deploy/            # hardhat-deploy script (wires contracts + default plan)
│   └── README.md          # ★ Design Answers (assignment §7.4 / §8.2) live here
├── frontend/              # React dApp (Vite + wagmi + RainbowKit)
│   ├── src/               # components, hooks, pure lib (unit-tested)
│   └── README.md          # frontend-specific setup, demo tips, feature tour
├── docs/
│   ├── REQUIREMENTS.md    # ★ assignment requirement → code/test traceability
│   ├── specs/             # design specs (contracts, frontend)
│   └── plans/             # task-by-task implementation plans
└── Final_Assignment.docx.pdf
```

**Where to look first as a grader:**
- Design Answers to the 7 open questions → [`hardhat-temp/README.md`](hardhat-temp/README.md) §7
- Requirement-by-requirement traceability → [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md)

## Requirements

| Requirement | Version / notes |
|---|---|
| **Node.js** | `^20.19.0 \|\| ^22.12.0 \|\| >=24.0.0` — developed and verified on **v26.3.0** (see `.nvmrc`). The range is the intersection of Vite 8's and Vitest 4's own `engines`. |
| **npm** | v10+ (verified on 11.16.0). Bundled with Node. |
| **MetaMask** | Or any injected browser wallet — needed for the frontend only. |
| **Solidity** | `0.8.28` — installed automatically by Hardhat, no manual setup. |
| **Git** | Any recent version. |

No global installs are required: Hardhat, Vite, and all tooling are local dev dependencies.

If you use `nvm`: `nvm use` picks up `.nvmrc`.

## Setup — smart contracts

```bash
cd hardhat-temp
npm install

npm test                    # 78 tests
npx hardhat coverage        # coverage report (>90% on every contract)
npx hardhat compile
```

Deploy to a local chain (two terminals):

```bash
# terminal 1 — keep running
cd hardhat-temp && npx hardhat node

# terminal 2
cd hardhat-temp && npx hardhat deploy --network localhost
```

This deploys all three contracts, wires `VaultManager.setSavingCore`, and creates the default
180-day / 225-bps / 550-bps plan. Addresses and ABIs are written to
`hardhat-temp/deployments/localhost/`.

## Setup — frontend

```bash
cd frontend
npm install
cp .env.example .env        # both variables are optional
npm run dev                 # http://localhost:5173
```

**After any (re)deploy**, refresh the generated contract bindings:

```bash
cd frontend && npm run codegen
```

`npm test` runs the 57 frontend unit tests.

Sepolia works out of the box — the deployed addresses ship in the repo, so you can simply
switch your wallet to Sepolia without deploying anything. See
[`frontend/README.md`](frontend/README.md) for MetaMask configuration, funding the Sepolia
vault, and how to fast-forward the local chain to demo maturity/grace flows.

### Environment variables (`frontend/.env`, both optional)

- `VITE_WC_PROJECT_ID` — WalletConnect Cloud project id. MetaMask works without it.
- `VITE_SEPOLIA_RPC` — overrides the default public Sepolia RPC.

Secrets for deploying (`hardhat-temp/.env`, only needed to deploy to a public network):
`TESTNET_PRIVATE_KEY`, `ETHERSCAN_API`. This file is gitignored — never commit a real key,
and use a throwaway testnet key only.

## Architecture in one paragraph

`SavingCore` custodies **user principal**; `VaultManager` holds the **bank's interest pool**.
Interest is always paid from the vault, never from another user's principal — the two pools
never mix. Each deposit snapshots its plan's APR, penalty, and tenor at open, so later admin
changes can never alter an existing deposit. Authorization is by ERC-721 ownership, so the
certificate itself is the claim. Full reasoning, the interest math with worked examples, and
answers to all seven open questions are in [`hardhat-temp/README.md`](hardhat-temp/README.md).

## Known limitations

- **Etherscan verification not completed** on Sepolia — the installed `hardhat-verify` plugin
  targets Etherscan's sunset V1 API. The deployed bytecode is correct and functional; only the
  "Verified" badge is missing.
- **The Sepolia interest vault starts empty.** Deposits work immediately, but interest payouts
  need the owner to fund the vault first (Admin tab → Fund vault).
- Deposit enumeration is client-side (log scan) because `SavingCore` is a plain ERC-721 and
  `DepositOpened`'s `owner` argument is not indexed. Fine at demo scale; a production system
  would add `ERC721Enumerable` or an indexer.
