# Cyclone v2 — Hub-and-Spoke Liquidity Architecture (Design)

**Date:** 2026-08-01
**Status:** Draft, awaiting approval. No code written yet.
**Scope:** Smart contracts. Frontend is a separate spec, written after Stage 3.
**Reference:** Aave v4 (`/home/khangia/bantu/aave-v4`), specifically `docs/overview.md`,
`src/hub/interfaces/IHubBase.sol`, and `src/hub/libraries/SharesMath.sol`.

---

## 1. Why this rewrite exists

Cyclone v1 is a closed system: `SavingCore` custodies principal that sits idle, and
`VaultManager` pays interest out of bank-funded capital. Principal earns nothing for the
protocol, and every new product would need its own pool of money.

v2 adopts Aave v4's **hub-and-spoke** model so that a single pool of liquidity backs every
product we build:

- The **Hub** is immutable, owns all liquidity, and does share accounting. Nothing else.
- **Spokes** are user-facing products. They hold no funds; they route user intent into the
  Hub's four primitives.
- Adding a product means registering a new Spoke. No liquidity migration, no forked pool.

```
    user ──> TermDepositSpoke ──┐         locked-tenor savings, ERC-721 certificate
                                │
    user ──> CreditSpoke ───────┼──> LiquidityHub (USDC)
             supply/borrow      │      add · remove · draw · restore
                                │
    future spoke ───────────────┘      register, don't migrate
                                │
                          TreasurySpoke                protocol fee cut
```

### 1.1 Decisions already taken

| Decision | Choice | Consequence |
|---|---|---|
| Deposit yield model | **Variable, Aave-style** | `aprBpsAtOpen` snapshot, `_computeInterest`, and the C1 `pendingInterest` machinery are all deleted. Yield becomes implicit in the share price. |
| Contract tooling | **Hardhat + Foundry** | Hardhat stays the deploy/codegen backbone (the frontend's wagmi pipeline reads `contract/deployments/`). Foundry is added *only* for fuzz and invariant tests on Hub accounting. |
| Upgradeability | **None** | Aave proxies its Spokes. We skip that: the Governor can already register and retire Spokes, which delivers most of the flexibility without proxy-admin and storage-layout hazard. The Hub is immutable by design anyway. |
| v1 contracts | **Left alone** | v2 is a fresh deployment. No on-chain migration. v1 stays on Sepolia as a historical artifact. |
| Personal variant | **Retired** | Plan parameters are free configuration in v2 — see §9.2. |

---

## 2. The Hub

One contract, one job: hold assets, track who supplied and who borrowed.

### 2.1 State

Per asset (keyed by `assetId`, so multi-asset works later without an API change):

| Field | Meaning |
|---|---|
| `underlying`, `decimals` | The ERC-20 |
| `liquidity` | Assets sitting in the Hub, **tracked internally** |
| `addedShares` | Total supply shares outstanding |
| `drawnShares` | Total borrow shares outstanding |
| `drawnIndex` | Borrow index, RAY-scaled, monotonically increasing |
| `lastUpdate` | Timestamp of the last accrual |
| `liquidityFee` | Protocol's cut of interest, in bps |
| `irStrategy` | Address of the interest rate strategy |

Per `(assetId, spoke)`:

| Field | Meaning |
|---|---|
| `addedShares`, `drawnShares` | That Spoke's slice of each side |
| `addCap`, `drawCap` | Ceilings, enforced by the Hub |
| `active` | Spoke may act at all |
| `halted` | Spoke may not perform liquidity-moving actions |

**`liquidity` is internal, never `token.balanceOf(address(this))`.** Anyone can transfer
tokens straight to the Hub; if the share price read from `balanceOf`, that donation would
move the price and could be used to grief depositors. Donations are simply invisible.

### 2.2 The four primitives

```solidity
add(assetId, amount)                      returns (shares)  // supply
remove(assetId, amount, to)               returns (shares)  // withdraw
draw(assetId, amount, to)                 returns (shares)  // borrow
restore(assetId, drawnAmount, premium)    returns (shares)  // repay
```

Only registered Spokes may call these, and every one begins by accruing interest. That is
the entire user-facing surface of the Hub; risk, oracles, liquidation, and tokenisation all
live in Spokes.

`reportDeficit` (bad debt that cannot be recovered) is deferred to Stage 4 — see §8.

### 2.3 Share math

Lifted from Aave's `SharesMath`, virtual offsets included:

```
VIRTUAL_ASSETS = VIRTUAL_SHARES = 1e6

toShares(assets) = assets × (totalShares + VIRTUAL_SHARES)
                          / (totalAssets + VIRTUAL_ASSETS)
```

The virtual offsets defeat the **share inflation attack**: against an empty pool, an
attacker supplies 1 wei, then donates a large amount directly to the contract to blow up the
price of a single share, so the next depositor's amount rounds down to zero shares and their
money is captured. With `1e6` added to both sides of every ratio, the attacker would have to
donate on the order of `1e6 ×` the victim's deposit for the rounding to bite. Combined with
internal `liquidity` accounting (§2.1) the attack is closed off twice over.

**Rounding always favours the protocol.** Integer division truncates, so every
asset↔share conversion sheds a sub-unit of dust. Dust cannot be eliminated; the only design
choice is who keeps it, and the answer must always be the pool. Stated as one rule: *what the
user receives rounds down, what the user owes rounds up.*

| Operation | Quantity computed | Direction | If reversed |
|---|---|---|---|
| `add` | shares minted to supplier | **down** | supplier gets shares worth more than they paid |
| `remove` | shares burned | **up** | withdrawer surrenders less value than they take |
| `draw` | debt shares minted | **up** | borrower's debt records less than they received |
| `restore` | debt shares burned | **down** | repayment clears more debt than was paid |

The stakes are not the size of one rounding error but its repeatability. If `add` rounded up
while `remove` rounded down, `add` immediately followed by `remove` returns more than it
consumed — a loop that nets a sub-unit per iteration and drains the pool given cheap enough
gas. This is the motivating case for the Foundry fuzz suite (§7), whose central assertion is
that no sequence of operations lets an actor withdraw more than they supplied plus legitimate
interest.

This is the same principle v1 already applied in its answer to Open Question #4: `Math.mulDiv`
floors, and the remainder is never turned into an obligation, so it can never cause a revert.
v2 generalises that reasoning from one interest formula to every conversion.

### 2.4 Interest accrual

```
totalOwed   = drawnShares × drawnIndex / RAY
totalAssets = liquidity + totalOwed
U           = totalOwed / totalAssets          // utilisation
```

On every touch:

```
rate         = irStrategy.rate(U)
drawnIndex  *= (1 + rate × Δt / SECONDS_PER_YEAR)
interest     = newTotalOwed − oldTotalOwed
feeShares    = toShares(interest × liquidityFee / BPS)   → minted to TreasurySpoke
```

Suppliers are never paid explicitly. `totalOwed` grows, therefore `totalAssets` grows,
therefore each share is worth more. **Supply yield is emergent, not disbursed** — this is the
single biggest conceptual departure from v1.

### 2.5 Interest rate strategy — the kinked curve

```
U ≤ optimal :  rate = base + slope1 × U / optimal
U > optimal :  rate = base + slope1 + slope2 × (U − optimal) / (1 − optimal)
```

`slope2` is deliberately steep. Its job is not revenue — it is the mechanism that reopens
withdrawals when the pool runs dry (see §6.1).

### 2.6 Invariants — these are what the Foundry tests exist to prove

1. `Σ spoke.addedShares == asset.addedShares`
2. `Σ spoke.drawnShares == asset.drawnShares`
3. Supply share price never decreases.
4. `drawnIndex` never decreases.
5. `liquidity` only changes through `add` / `remove` / `draw` / `restore`.
6. `remove` can never pay out more than `liquidity`.

---

## 3. TermDepositSpoke — v1's SavingCore, rebuilt

Keeps the product (fixed tenor, early-withdraw penalty, ERC-721 certificate). Loses the
fixed APR.

### 3.1 What a Plan becomes

| v1 | v2 |
|---|---|
| `tenorDays` | unchanged |
| `aprBps` | **deleted** — yield comes from the Hub |
| `minDeposit`, `maxDeposit` | unchanged |
| `earlyWithdrawPenaltyBps` | unchanged |
| `enabled` | unchanged |

### 3.2 What a Deposit becomes

```solidity
struct Deposit {
  uint256 planId;
  uint256 shares;            // Hub supply shares — this IS the position
  uint256 principalAtOpen;   // assets in, kept for penalty math
  uint256 startAt;
  uint256 maturityAt;
  uint256 tenorDaysAtOpen;
  uint256 penaltyBpsAtOpen;
  DepositStatus status;
}
```

`principal` is replaced by `shares`. Current value is `hub.previewRemoveByShares(shares)`,
which only ever goes up.

### 3.3 Flows

| Flow | Behaviour |
|---|---|
| `openDeposit` | pull USDC → `hub.add()` → store shares → `_safeMint` certificate |
| `withdrawAtMaturity` | `hub.remove(shares)` → everything to the user |
| `earlyWithdraw` | `hub.remove(shares)`; user receives `principalAtOpen − penalty`; accrued yield above principal is forfeited to the Treasury — mirrors v1's "no interest on early exit" |
| `renewDeposit` | push `maturityAt` out. **The NFT is not re-minted** — yield already compounds inside the share price, so there is nothing to fold into a new principal |
| `autoRenewDeposit` | permissionless after the grace period, same extension, keeper paid a bps slice of accrued yield |

Renewal collapsing to "extend the timestamp" is a direct consequence of variable yield, and
is a large simplification over v1's mint-a-new-NFT dance.

### 3.4 What gets deleted

`aprBpsAtOpen`, `_computeInterest`, `previewInterest`, `pendingInterest`, `claimInterest`,
`_payInterestSafe`, and `VaultManager.payInterest`. The C1 guarantee is no longer implemented
by code — it is replaced by a structural property (you own shares) plus a new liquidity
caveat (§6.1).

---

## 4. CreditSpoke — the lending product

### 4.1 Positions

- **Collateral**: USDC supplied directly to the Spoke, *or* a TermDeposit certificate NFT.
- **Debt**: drawn from the Hub.
- `HF = Σ(collateralValue × CF) / debt`, liquidatable below 1.

### 4.2 No oracle, and why that is legitimate here

Collateral and debt are both USDC. There is no exchange rate to feed. Better: a supply share
price is monotonically non-decreasing (Hub invariant 3), so collateral value **cannot fall**.
Every liquidation is therefore triggered by debt growing past a fixed line, never by
collateral falling — and the crossing time is computable in closed form from the current
rate.

An oracle becomes mandatory the moment a second asset is listed. The `assetId` in the Hub API
exists so that day does not require a rewrite.

### 4.3 NFT collateral

The Spoke takes custody of the certificate, which makes it `ownerOf`, which means it can call
`withdrawAtMaturity` / `earlyWithdraw` on TermDepositSpoke through the ordinary public
interface. **No privileged spoke-to-spoke hook is needed.**

Liquidation of an NFT-collateralised loan: force-close the deposit (early-withdraw path if
pre-maturity, paying the penalty), repay debt from proceeds, pay the liquidator a bonus,
return the remainder to the borrower.

`CF` for NFT collateral is set against the **penalty-adjusted floor**,
`principalAtOpen × (1 − penaltyBps)`, i.e. the worst case where liquidation must break the
term. With the current 550 bps penalty that floor is 94.5% of principal.

### 4.4 Deferred to a later stage

Aave's Risk Premium (premium shares plus an offset, repricing debt by collateral quality) is
elegant but is the most intricate machinery in the protocol. Base drawn rate only, at first.

---

## 5. TreasurySpoke — what VaultManager becomes

VaultManager's reason to exist was funding interest, and interest is no longer funded. It is
repurposed as the Spoke that receives `liquidityFee` share mints and early-withdraw penalties.
Its timelocked-withdrawal design (v1 bonus F) is worth keeping verbatim — it is the right
control for a treasury.

---

## 6. Risks

### 6.1 Principal is no longer instantly withdrawable — a genuine regression

In v1, principal sat untouched in `SavingCore`; a matured depositor could always withdraw. In
v2 principal is lent out. **At 100% utilisation there is no free liquidity and withdrawal
reverts** until a borrower repays or someone supplies.

This is not a bug; it is the standard trade-off every lending protocol makes, and the kinked
curve (§2.5) is the mechanism that resolves it: utilisation spiking drives the borrow rate up
hard, which forces repayment and attracts supply. It must be stated plainly in user-facing
docs, because it weakens a guarantee v1 advertised.

### 6.2 Circular leverage

Deposit USDC → receive certificate → post it as collateral → borrow USDC → deposit again.
Each loop is backed by the same underlying capital. Bounded by `CF < 100%` and `drawCap`, but
it needs an explicit test that the loop converges rather than mints unbacked exposure.

### 6.3 A Spoke is trusted code

The Hub authorises Spokes wholesale. A buggy Spoke can drain its own caps. Caps are the blast
radius, so they must be set conservatively at registration, not left at "no cap".

### 6.4 Pause interaction

If TermDepositSpoke is paused, CreditSpoke cannot force-close NFT collateral, so liquidations
stall. Either liquidation gets an exemption, or the pause semantics must be documented as
"pausing deposits also freezes dependent liquidations".

---

## 7. Testing

| Layer | Tool | What it proves |
|---|---|---|
| Unit / flows | Hardhat (existing style) | Every branch of every Spoke flow |
| Fuzz | Foundry | Rounding never favours the user; `add`/`remove` round-trips never profit |
| **Invariant** | Foundry | The six invariants in §2.6, under randomised action sequences |

Invariant testing is the reason Foundry is being added. It drives a random sequence of
`add`/`remove`/`draw`/`restore` across multiple actors and asserts the invariants after every
step — the only realistic way to catch share-accounting bugs, which are the expensive kind.

Coverage bar stays above 90%.

---

## 8. Staged delivery

Each stage ends green and reviewable.

| Stage | Deliverable |
|---|---|
| **0** | Foundry installed alongside Hardhat, both toolchains running on one `contract/` tree |
| **1** | `LiquidityHub` + `SharesMath` + `InterestRateStrategy`, driven by a minimal mock Spoke. Full invariant suite. **Highest-risk stage — everything rests on it.** |
| **2** | `TermDepositSpoke` + `TreasurySpoke`. Feature parity with v1 minus fixed APR |
| **3** | `CreditSpoke`: supply, borrow, repay, liquidate, with USDC collateral |
| **4** | NFT collateral, `reportDeficit` / bad-debt handling |
| **5** | Frontend: new tabs, regenerated wagmi bindings |

Stage 1 is where the real difficulty is concentrated. Stages 2–5 are comparatively mechanical
once the Hub's accounting is proven.

---

## 9. Resolved questions

### 9.1 Repository layout — one package, Aave's internal layout

v2 lives in the existing `contract/` package, organised the way `aave-v4/src/` is organised.
v1 moves into `contracts/v1/` intact rather than being deleted: the root `README.md`,
`docs/REQUIREMENTS.md`, and `contract/README.md` all cite it line-by-line as the submission
record, and it still compiles and keeps its 82 tests green there.

```
contract/
├── contracts/
│   ├── hub/            LiquidityHub.sol, InterestRateStrategy.sol
│   │   └── libraries/  SharesMath.sol
│   ├── spoke/          TermDepositSpoke.sol, CreditSpoke.sol, TreasurySpoke.sol
│   ├── interfaces/     IHub.sol, ISpoke.sol
│   ├── mocks/          MockUSDC.sol, MockSpoke.sol
│   └── v1/             SavingCore.sol, VaultManager.sol
├── test/{v1,v2}/
└── test-foundry/       fuzz + invariant
```

Splitting into a second package was rejected on concrete grounds: `wagmi.config.ts` points at
a single `project: '../contract'`, the deploy script already separates concerns via
`func.tags`, `hardhat.config.ts` declares no custom `paths` (so subdirectories compile with
no config change), and a second package would need its own Docker named volume and install
step — on a package that already needs `yarn` because npm's resolver fails on it.

The industry norm of one repository per protocol version (Aave v3/v4, Uniswap v2/v3/v4,
Compound/Comet) is a norm for multi-team, independently-audited codebases. What is worth
copying at this scale is Aave v4's *internal* directory layout, which is what the tree above
does.

Tag the current commit `v1.0-submission` before restructuring so the graded state is
permanently retrievable.

### 9.2 Personal-variant parameters — retired

The student-ID derivation (A=1, B=5 → 225 bps / 550 bps / 180 days / 3 days) does not carry
into v2. Plan parameters become ordinary configuration with no external constraint, and the
225 bps APR simply ceases to exist along with fixed-rate yield.

Proposed v2 defaults, chosen for legibility rather than derived from anything: 90/180/365-day
plans, 500 bps early-withdraw penalty, 3-day grace.

v1's documentation keeps its variant section unchanged — it is the record of what was graded.
Note that `CLAUDE.md` currently states the variant values "must stay consistent across
contracts, tests, deploy script, and docs"; that convention now applies to `contracts/v1/`
only and the file needs updating to say so.

### 9.3 Keeper reward — self-funding

Accepted as proposed: the keeper takes a bps slice of the position's accrued yield at
renewal. No treasury funding, so the incentive cannot dry up the way v1's vault-funded reward
could.
