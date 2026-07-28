# Contributing

This repo has two independent npm/yarn packages — `frontend/` (the React dApp) and
`contract/` (the Hardhat smart-contract project) — plus a Docker dev environment that wraps
both. There is no root `package.json` / workspace; each package is installed and run from its
own directory.

## Development environment setup

### Option A — host machine

Prerequisites: Node.js matching `.nvmrc` (`26.3.0`, or the range in each package's `engines`
field), npm, and — for `contract/` — **yarn** (see the note below on why npm alone isn't
enough there).

```bash
cd contract && yarn install
cd frontend && npm install
```

### Option B — Docker dev container (no local Node/npm required)

```bash
docker compose up -d
docker compose exec dev bash
# inside the container:
cd contract && yarn install
cd frontend && npm install
```

VS Code users can instead install the **Dev Containers** extension and *Reopen in Container*
(`.devcontainer/devcontainer.json`) so the editor itself runs inside the container and can
resolve `node_modules` for IntelliSense/type-checking.

<!-- AUTO-GENERATED: package.json scripts -->
## Available scripts — `frontend/`

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server (`http://localhost:5173`) |
| `npm run build` | Type-check (`tsc -b`) then production build to `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
| `npm test` | Run the Vitest unit test suite (61 tests) |
| `npm run codegen` | Regenerate `src/generated.ts` (ABIs + addresses) from `contract/` artifacts/deployments, then sync the deployment block number |

## Available scripts — `contract/`

| Command | Description |
|---|---|
| `npm run compile` | Compile all contracts (Solidity 0.8.28) |
| `npm test` | Run the Mocha/Chai contract test suite (81 tests) |
| `npm run node` | Start a local Hardhat node (chain id `31337`) |
| `npm run size` | Print deployed/init-code contract sizes |
| `npm run clean` | Remove Hardhat's `cache/` and `artifacts/` |
| `npm run run:sepolia` | Run a script against the `sepolia` network |
| `npm run run:ethereum` | Run a script against the `ethereum` (mainnet) network |
| `npm run keeper:sepolia` | Run the permissionless keeper bot (`scripts/keeper-bot.ts`) against `sepolia` — set `ONCE=1` for a single scan |
| `npm run keeper:localhost` | Same, against a local Hardhat node |
| `npm run seed:demo` | Seed 4 deposits (one per demo use case) on a local node, for live presentations (`scripts/seed-demo.ts`) |
| `npx hardhat deploy --network <net>` | Deploy via `hardhat-deploy` (not a package.json script, used directly) |
| `npx hardhat coverage` | Solidity coverage report |
<!-- /AUTO-GENERATED -->

<!-- AUTO-GENERATED: .env.example -->
## Environment variables

| Variable | Package | Required | Description |
|---|---|---|---|
| `VITE_WC_PROJECT_ID` | `frontend` | No | WalletConnect Cloud project id. MetaMask works without it. |
| `VITE_SEPOLIA_RPC` | `frontend` | No | Overrides the default public Sepolia RPC endpoint. |
| `REPORT_GAS` | `contract` | No | Set to enable `hardhat-gas-reporter` output during tests. |
| `TESTNET_PRIVATE_KEY` | `contract` | Only to deploy to Sepolia | Deployer private key. Use a throwaway testnet key — never a real one. |
| `MAINNET_PRIVATE_KEY` | `contract` | Only to deploy to mainnet | Deployer private key. |
| `ETHERSCAN_API` | `contract` | Only for contract verification | Etherscan API key. |

Copy `frontend/.env.example` → `frontend/.env` and `contract/.env_example` → `contract/.env`.
Both `.env` files are gitignored — never commit real keys.
<!-- /AUTO-GENERATED -->

## Testing

```bash
cd contract && npm test        # 81 contract tests
cd contract && npx hardhat coverage   # coverage report, >90% required per contract
cd frontend && npm test        # 61 frontend unit tests (Vitest)
```

Contract coverage requirement (per the assignment spec): >90% statements on `MockUSDC`,
`VaultManager`, and `SavingCore`. See [`docs/REQUIREMENTS.md`](REQUIREMENTS.md) for the full
requirement-to-test traceability.

## Code style

- **`contract/`**: Prettier is configured (`printWidth: 120`, see `package.json`). No ESLint.
- **`frontend/`**: No ESLint or Prettier config present — style is enforced only through strict
  TypeScript compiler flags (`noUnusedLocals`, `noUnusedParameters`, etc. in `tsconfig.app.json`).
  Match the existing formatting conventions in the file you're editing.

## Pull request checklist

- [ ] `npm test` passes in both `frontend/` and `contract/`
- [ ] `npx hardhat coverage` still meets the >90% threshold if contracts changed
- [ ] `npm run codegen` was re-run in `frontend/` if `contract/` artifacts or deployments changed
- [ ] `npm run build` (frontend) and `npx hardhat compile` (contract) succeed with no new errors
- [ ] No real private keys or API keys committed (`.env` files stay gitignored)
- [ ] Docs updated if you changed scripts, env vars, or the Docker setup (this file, root
      `README.md`, `docs/RUNBOOK.md`)
