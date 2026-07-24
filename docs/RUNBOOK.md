# Runbook

This is a coursework smart-contract project (term-deposit dApp), not a production service —
there's no on-call rotation or paging. This runbook covers deploying the contracts, verifying
they're live, and fixes for issues already hit during development.

## Deployment procedures

### Local (Hardhat network, chain id `31337`)

```bash
# terminal 1 — keep running
cd contract && npx hardhat node

# terminal 2
cd contract && npx hardhat deploy --network localhost
cd frontend && npm run codegen   # picks up the new addresses + deployment block
```

### Sepolia (chain id `11155111`)

The contracts are already deployed (addresses baked into `frontend/src/generated.ts`); only
redeploy if you need a fresh instance.

1. Put a funded deployer key in `contract/.env` as `TESTNET_PRIVATE_KEY` (throwaway key only —
   never commit it).
2. `cd contract && npx hardhat deploy --network sepolia`
3. `cd frontend && npm run codegen` — regenerates addresses/ABIs from the new
   `contract/deployments/sepolia/*.json` files.
4. Fund the vault as the owner account (Admin tab → Fund vault) before demoing interest/claim
   flows — a freshly deployed `VaultManager` starts empty.

### Rollback

The contracts are **not upgradeable** (plain deploys, no proxy). "Rollback" means redeploying a
previous or corrected version as a new instance and re-running `npm run codegen` so the
frontend points at it — there is no in-place downgrade. Old deployment JSON files under
`contract/deployments/<network>/` are the historical record of prior addresses if you need to
point back at one.

## Running the permissionless keeper bot

`SavingCore.autoRenewDeposit` is callable by anyone after `maturityAt + GRACE_PERIOD`, but
nothing triggers it on its own — matured deposits just sit `Active` until someone calls it.
`contract/scripts/keeper-bot.ts` is a reference bot: it scans every deposit (`0..nextDepositId-1`
via the public `deposits` mapping) and calls `autoRenewDeposit` on each eligible one, earning
`keeperRewardBps` of the interest per call (that reward is `0` unless the owner has set it via
Admin tab → Set keeper — otherwise the caller only pays gas).

```bash
cd contract
ONCE=1 npm run keeper:sepolia   # single scan, then exit
npm run keeper:sepolia          # loop forever, polling every POLL_INTERVAL_MS (default 60_000)
```

Swap `keeper:sepolia` for `keeper:localhost` to run against a local node. It reads the signer
from `TESTNET_PRIVATE_KEY` in `contract/.env` — same account the deploy scripts use — but that
account does not need to own any of the deposits it renews; that's the point of the bonus-G
permissionless design.

## Health checks

There's no dashboard; confirm liveness directly against the RPC:

```bash
# chain is up and responding
curl -s -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
  http://localhost:8545   # or the Sepolia RPC URL

# contracts are actually deployed at the recorded addresses
cd contract && npx hardhat console --network <localhost|sepolia>
> const c = await ethers.getContractAt("SavingCore", "<address>")
> await c.owner()
```

If the frontend loads but shows no data, check the browser console/network tab for RPC errors
and confirm the wallet is on the expected chain id.

## Common issues and fixes

### `npm run codegen` fails with "hardhat must be installed to use Hardhat plugin"

**Cause**: `@wagmi/cli`'s Hardhat plugin shells out `npm ls hardhat` in `contract/` to check
it's installed. That command exits non-zero because several `@nomicfoundation/hardhat-*`
plugins declare peer-dependency ranges (e.g. `hardhat@^2.26.0`) that don't match the installed
`hardhat@2.25.0` — npm reports this as `ELSPROBLEMS` even though hardhat itself is installed
and fully functional (`npx hardhat compile` works fine). `@wagmi/cli` picks `npm` (over `yarn`)
because it reads the `npm_config_user_agent` env var, which is always `npm` when a script is
run via `npm run ...`, regardless of `contract/`'s own lockfile.

**Fix applied**: `frontend/package.json`'s `codegen` script now sets
`npm_config_user_agent=yarn` before invoking `wagmi generate`, which makes the plugin's
package-manager detection use `yarn why hardhat` instead — that command tolerates the peer
mismatches. No action needed; this is already baked into the script.

### `npm install` fails in `contract/` with a 404 for `@ethereumjs/testdata`

**Cause**: a transitive dependency (pulled in via `ethereum-waffle`) resolves to a package
version that's been removed from the npm registry. This only happens with a fresh `npm install`
that re-resolves the dependency tree.

**Fix**: use `yarn install` in `contract/` instead — `yarn.lock` pins a working resolution.
`frontend/` is unaffected; plain `npm install` works there.

### Docker: `hardhat-temp/` (or similar) directory reappears, owned by `root`

**Cause**: `docker-compose.yml`'s named volume for `contract/node_modules` was pointed at a
stale path after a directory rename. Docker Compose silently creates the mount-point directory
(as `root`, since the container runs as root) if the target path doesn't exist, instead of
erroring.

**Fix**: make sure the volume target in `docker-compose.yml` matches the actual current
directory name. Remove any stray root-owned leftover directory with `sudo rm -rf <name>` (a
regular user can't remove root-owned files).

### VS Code shows red squiggly errors everywhere despite the app running fine

**Cause**: the editor runs on the host and reads files from the host disk. `node_modules` for
both packages live in Docker named volumes, not on the host — the TypeScript/ESLint language
server can't resolve React/JSX types from the host side.

**Fix**: use **Dev Containers** → *Reopen in Container* so the editor process itself runs
inside the container and can see `node_modules`. See root [`README.md`](../README.md#setup--docker-dev-container-optional-no-local-nodenpm-needed).

### Etherscan verification fails on Sepolia

**Cause**: the installed `hardhat-verify` plugin targets Etherscan's V1 API, which Etherscan
has sunset in favor of V2. The deployed bytecode is correct and functional; only the "Verified"
badge on Etherscan is missing. Not currently fixed — would require upgrading `hardhat-verify`
and adjusting its config for the V2 API.

### Sepolia interest payouts fail / vault balance is zero

**Cause**: a freshly deployed (or the shared) `VaultManager` doesn't auto-fund itself.

**Fix**: connect as the owner account, Admin tab → mint MockUSDC → approve vault → **Fund
vault**, before demoing claim/interest flows.
