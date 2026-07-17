# Blockchain Term Deposit System (On-Chain Online Banking)

A blockchain-based term-deposit ("savings account") protocol. Users lock ERC-20
tokens into a saving plan for a fixed tenor, earn simple interest paid from a
separate bank-owned vault, and hold a transferable ERC-721 certificate. They can
withdraw at maturity, withdraw early (with penalty), manually renew, or be
auto-renewed by a permissionless keeper after a grace period.

---

## 1. Personal Variant (Section 8.1)

**Student ID: K234141651** → `A` = last digit = **1**, `B` = second-to-last digit = **5**.

| Parameter | Formula | Computed value |
|---|---|---|
| Grace period (auto-renew) | `(A mod 3) + 2` = `(1 mod 3) + 2` | **3 days** |
| Default plan APR | `200 + A * 25` = `200 + 25` | **225 bps (2.25%)** |
| Early-withdraw penalty | `300 + B * 50` = `300 + 250` | **550 bps (5.50%)** |
| Default plan tenor | `B` is odd → 180 | **180 days** |

These exact values are used in the default deploy plan, in every test, and in the
demo. `GRACE_PERIOD = 3 days` is a constant in `SavingCore.sol`; the default plan
(`225` bps / `180` days / `550` bps penalty) is created by `deploy/1-deploy.ts`.

---

## 2. Architecture — Why Three Contracts

The system separates **the customers' money**, **the bank's money**, and **the
business rules** into three contracts, mirroring how a real bank keeps deposits,
its own capital, and its policies apart.

| Contract | Holds / does | Why separate |
|---|---|---|
| `MockUSDC.sol` | 6-decimal ERC-20 test token, open `mint`. | Real USDC can't be minted; a 6-decimal test token surfaces decimal bugs early (1 USDC = 1,000,000 units). |
| `VaultManager.sol` | The **interest pool** (bank capital). Admin funds/withdraws it, sets the fee receiver, pauses payouts. | Bank capital must be isolated from user principal. If the interest pool is empty or buggy, user principal is still safe in `SavingCore`. One clear place for admin money controls. |
| `SavingCore.sol` | **User principal** + all business logic: plans, deposit lifecycle, ERC-721 certificate. | Business rules change more often than money storage. Isolating logic from capital makes the system easier to test, audit, and reason about (separation of duties). |

**Core invariant:** `SavingCore` holds users' principal; `VaultManager` holds the
bank's interest money. Interest is **always** paid from the vault, **never** from
another user's principal. The two pools never mix.

### 2.1 Money flow

- `openDeposit` — user's USDC → `SavingCore` (principal custody).
- `withdrawAtMaturity` — `SavingCore` returns principal from its own balance, and
  calls `VaultManager.payInterest` to send interest.
- `earlyWithdraw` — `SavingCore` returns `principal − penalty`; penalty → fee
  receiver. No vault interaction.
- `renew` / `autoRenew` — interest is pulled from the vault into `SavingCore` and
  compounded into the new principal.
- The vault is funded / withdrawn only by the admin.

### 2.2 Deployment order (contracts reference each other)

1. `MockUSDC`
2. `VaultManager(usdc)`
3. `SavingCore(usdc, vaultManager)`
4. `vaultManager.setSavingCore(savingCore)` — one-time wiring.

---

## 3. Extra Design Choices (explained, per Section 1)

The assignment says a different architecture is fine — an *unexplained* one is not.
These are the choices beyond the minimum three contracts, and why:

1. **`IVaultManager` interface** — `SavingCore` depends on a minimal interface, not
   the concrete vault, so the two contracts compile independently and the vault
   could be swapped for an upgraded implementation later.

2. **One-time `setSavingCore`** — `VaultManager.payInterest` is `onlySavingCore`.
   The core address can be set exactly once (`require(savingCore == address(0))`)
   and never changed. This prevents a compromised/malicious owner from later
   re-pointing the vault's payout authority at an attacker contract to drain it.

3. **`payInterest` never reverts on shortfall** — it pays `min(amount, balance)`
   and returns the amount actually paid. This is the foundation of bonus **C1**
   (principal always safe): a poor/empty vault can never freeze a user's own
   principal. See §5.1.

4. **Separate `Pausable` on each contract** — `SavingCore` has its own pause that
   gates every user entry point (`openDeposit`, `withdrawAtMaturity`,
   `earlyWithdraw`, `renewDeposit`, `autoRenewDeposit`, `claimInterest`);
   `VaultManager` independently pauses `payInterest`. Same owner controls both. A
   full emergency stop = pause `SavingCore`. The vault's own pause is
   defense-in-depth on the payout path.

5. **Pausing also blocks `openDeposit`** — the spec only requires pause to block
   withdrawals/renewals. We additionally block *new deposits* while paused, because
   accepting new principal during an incident is unsafe. This is stricter than the
   minimum and intentional.

6. **`tenorDaysAtOpen` snapshot** — auto-renew must reuse the *same tenor* as the
   original deposit, so the tenor is snapshotted alongside APR and penalty and is
   immutable per deposit.

7. **`previewInterest(depositId)` view** — lets the frontend and tests read the
   exact interest a deposit would earn, using the same integer math as the payout
   path (no off-chain rounding drift).

8. **`MaliciousReceiver.sol` (test only, `contracts/test/`)** — an attacker
   contract used to prove the reentrancy guard on the `_safeMint` path. Not part of
   the deployed system.

---

## 4. Interest & Penalty Math

Simple interest, with APR snapshotted at open (no compounding within a term):

```
tenorSeconds = tenorDaysAtOpen * 86400
interest = mulDiv(principal, aprBpsAtOpen * tenorSeconds, 365 days * 10000)
```

- Uses OpenZeppelin `Math.mulDiv` — a single full-precision multiply-then-divide,
  no intermediate overflow, matching the "multiply before divide" precision tip.
- `365 days` in Solidity = `31,536,000` seconds; `10000` converts basis points to a
  rate.

Penalty (early withdrawal):

```
penalty = mulDiv(principal, penaltyBpsAtOpen, 10000)
userReceives = principal - penalty     // interest = 0 on early withdrawal
```

### Worked example with **my** variant values

Alice deposits **1,000 USDC** (`1,000,000,000` units) for **180 days** at **225 bps**:

```
tenorSeconds = 180 * 86400 = 15,552,000
interest = mulDiv(1_000_000_000, 225 * 15_552_000, 31_536_000 * 10_000)
         = 11,095,890 units  ≈ 11.10 USDC
Alice receives at maturity: 1,000 + 11.10 = 1,011.10 USDC
```

Early withdrawal of the same deposit (**550 bps** penalty):

```
penalty = mulDiv(1_000_000_000, 550, 10_000) = 55,000,000 units = 55 USDC
Alice receives: 1,000 - 55 = 945 USDC   (interest = 0, 55 USDC → feeReceiver)
```

---

## 5. Bonus Challenges

Each bonus keeps all base flows passing, has its own tests, and is summarized here
with **problem → solution → trade-off**.

### 5.1 C1 — Principal is always safe (Section 8.3 C1)

- **Problem:** The base rule reverts when the vault can't cover interest, so the
  bank could freeze a user's *own principal* forever simply by never funding the
  vault.
- **Solution:** `VaultManager.payInterest` pays what it can and returns the paid
  amount; it never reverts. `SavingCore` returns principal in full immediately
  whenever the system is operational — an empty or underfunded vault can never
  freeze it, because principal is transferred from `SavingCore`'s own balance
  *before* the vault is ever called. Any interest shortfall is recorded in
  `deposit.pendingInterest`, and the certificate NFT is **not** burned. The holder
  calls `claimInterest(depositId)` to collect the remainder once the vault is
  refunded. Applied uniformly to `withdrawAtMaturity`, `renewDeposit`, and
  `autoRenewDeposit`. The one thing that *can* withhold principal is a deliberate
  emergency pause (required by Business Rule #6, §8) — that's an intentional admin
  stop, not a vault-funding failure, and C1 is about the latter.
- **Trade-off:** The bank still owes the interest — it becomes an on-chain
  liability (`pendingInterest`) instead of the user's funds being locked. Slightly
  more state per deposit.
- **Tests:** `SavingCore` → "C1: principal always safe when vault is short".

### 5.2 G — Permissionless keeper incentive (original idea; answers Open Question #3)

- **Problem:** Auto-renew relies on an off-chain bot. If that bot dies, matured
  deposits sit idle and stop compounding.
- **Solution:** `autoRenewDeposit` has **no caller restriction** — anyone can call
  it after the grace period. The caller earns
  `keeperReward = mulDiv(interest, keeperRewardBps, 10000)`, paid **from the vault
  on top of** the user's interest, never from principal. If the official bot dies,
  any third party (or the user) is economically incentivized to trigger it.
- **Trade-off:** A small slice of vault yield goes to keepers. The user is fully
  protected — they keep their original APR and full interest; the reward is extra.
- **Tests:** `SavingCore` → "autoRenewDeposit (keeper, bonus G)".

### 5.3 F — Timelock on vault withdrawal (original idea)

- **Problem:** The base spec lets the admin drain the vault instantly; deposits that
  were payable yesterday can become unpayable today with no warning.
- **Solution:** `withdrawVault` is split into `scheduleWithdrawVault(amount)` →
  wait `TIMELOCK_DELAY` (2 days) → `executeWithdrawVault()`, with
  `cancelScheduledWithdrawal()` to abort. `pause()` is intentionally **not**
  timelocked — an emergency stop must be instant.
- **Trade-off:** The admin can't instantly pull the interest pool; users/keepers get
  a warning window. Adds a small schedule/execute state machine.
- **Tests:** `VaultManager` → "timelock withdraw".

---

## 6. Required Events (Section 5)

```
PlanCreated(planId, tenorDays, aprBps)
PlanUpdated(planId, newAprBps)
DepositOpened(depositId, owner, planId, principal, maturityAt, aprBpsAtOpen)
Withdrawn(depositId, owner, principal, interest, isEarly)
Renewed(oldDepositId, newDepositId, newPrincipal, newPlanId)
```

Additional events for our features: `InterestClaimed`, `KeeperRewardPaid`,
`Funded`, `FeeReceiverUpdated`, `InterestPaid`, `SavingCoreSet`,
`VaultWithdrawScheduled` / `Executed` / `Cancelled`, `PlanEnabled` / `PlanDisabled`,
`KeeperRewardUpdated`.

---

## 7. Design Answers (Section 8.2)

### Q1 — Transferable certificate: who can withdraw, Alice or Bob?

**Bob (the current NFT holder) can withdraw.** Every action checks the certificate
owner, not the original depositor. The deciding line is in `SavingCore._requireOwner`
(`contracts/SavingCore.sol:164-166`):

```solidity
require(ownerOf(depositId) == msg.sender, "not owner");
```

The certificate **is** the claim on the deposit, so selling the NFT sells the
withdrawal right — this is the intended, useful behavior (deposits become tradable).
It is only "dangerous" if a user transfers the NFT without understanding they gave
away the money; that is a UX/education concern, not a contract bug. Our test
"the NFT owner (buyer) can withdraw after transfer" demonstrates it.

### Q2 — Empty vault at maturity: what problem, and which design did you choose?

If the contract simply reverts (the base rule), the user cannot get their **own
principal** back until the bank funds the vault — the bank can lock a customer's
money indefinitely by neglecting the vault. **We chose bonus C1 instead:** pay the
full principal immediately, record the interest shortfall as `pendingInterest`, and
let the holder call `claimInterest` later. We chose this because a user's principal
should never be hostage to the bank's liability. The interest is still owed and
tracked on-chain; only the *payout timing* is deferred, and only for the interest.
Precisely: principal is returned in full immediately whenever the system is
operational — an empty or underfunded vault (`VaultManager.payInterest`,
`contracts/VaultManager.sol:64-77`) can never freeze it, because `withdrawAtMaturity`
transfers principal from `SavingCore`'s own balance (`contracts/SavingCore.sol:184`)
*before* it even calls the vault. The only thing that withholds principal is a
deliberate emergency pause, which §8's Business Rules Checklist (rule 6, "paused ⇒
no withdrawals/renewals") requires.

### Q3 — Dead bot for a month: does the user lose anything?

Structurally the user loses nothing — a matured, un-renewed deposit stays `Active`;
its principal and already-earned interest are fully claimable at any time. What they
*miss* is the extra compounding the auto-renew would have started. **Our fix is
bonus G:** `autoRenewDeposit` is permissionless and pays a keeper reward, so even if
the official bot is offline, anyone (including the user) is incentivized to trigger
the renewal. The user keeps their original APR for the renewed term.

### Q4 — Rounding dust: who keeps it, and can it cause a revert?

Integer division in `mulDiv` (`contracts/SavingCore.sol:334-337`) always truncates
**down**, so `mulDiv` floors and the bank's liability *is* the floored amount — the
remainder is never created as an obligation, it simply never leaves the vault (the
bank keeps the dust). Concretely, our own worked example in §4 has real dust: 1,000
USDC @ 225 bps / 180 days computes to **11,095,890.41** units and floors to
**11,095,890** — 0.41 units are withheld and stay in the vault every time that exact
deposit matures. Because the contract only ever computes and pays the floored amount,
it can **never** try to pay more than it computed, so rounding can never cause a
revert or a wrong balance — `payInterest` is additionally capped at the vault balance
as a second line of defense. Our test "rounding dust" covers the other extreme: a
deposit so small that interest floors all the way to `0`, and asserts the withdrawal
still succeeds, principal is returned in full, and the vault balance is unchanged.

### Q5 — Boundary times: `>=` or `>`?

| Action | Condition | Operator | Line | Reason |
|---|---|---|---|---|
| `withdrawAtMaturity` | `block.timestamp >= maturityAt` | `>=` | `SavingCore.sol:176` | The **exact** maturity second counts as "at maturity", not early. |
| `earlyWithdraw` | `block.timestamp < maturityAt` | `<` | `SavingCore.sol:201` | Strictly before maturity is early; the two conditions are exact complements, so every instant maps to exactly one path. |
| `renewDeposit` (manual) | `block.timestamp >= maturityAt` | `>=` | `SavingCore.sol:242` | Renew is allowed from maturity onward, with no upper bound. |
| `autoRenewDeposit` | `block.timestamp >= maturityAt + GRACE_PERIOD` | `>=` | `SavingCore.sol:276` | The user can still be auto-renewed **at** the exact end of the grace period. |

At the exact end of the grace period the user can *still* manually renew too, because
manual renew has no upper time bound — it stays available until a keeper actually
auto-renews the deposit first (whichever transaction lands first wins, and both flip
the deposit out of `Active`).

### Q6 — Disabled plan with active deposits: what can users still do?

Disabling a plan only stops **new principal** from entering under that plan. Holders
of existing deposits from a disabled plan can still:

- `withdrawAtMaturity`, `earlyWithdraw`, and `claimInterest` — unaffected.
- `autoRenewDeposit` — allowed, because auto-renew continues the deposit's **own
  snapshotted terms** and does not read the current plan, so it doesn't check
  `enabled`.
- `renewDeposit` (manual) — allowed **only into an enabled plan**. Renewing *into*
  a disabled plan reverts, at `contracts/SavingCore.sol:245`:

```solidity
require(np.enabled, "plan disabled");
```

Justification: manual renew is the user actively *choosing* a plan for fresh terms,
so it must respect whether that plan is open. Auto-renew is a passive continuation of
already-agreed terms, so it is not blocked by a later disable.

### Q7 — One realistic attack and the exact mechanism that stops it

**Attack: reentrancy on the mint path.** The only place the protocol calls into an
arbitrary recipient contract is `_safeMint` → `onERC721Received` (in `openDeposit`,
`renewDeposit`, `autoRenewDeposit`). A malicious ERC-721 receiver could try to
re-enter a state-changing function from that callback to double-spend. (ERC-20
`safeTransfer` in the withdraw paths calls **no** recipient hook, so it is not a
reentrancy vector.)

**Two independent defenses:**

1. `nonReentrant` on every value-moving function — a reentrant call reverts with
   `ReentrancyGuardReentrantCall`.
2. Checks-Effects-Interactions: the deposit status is flipped **before** any external
   call, e.g. in `withdrawAtMaturity` (`contracts/SavingCore.sol:182` and `:184`):

```solidity
d.status = DepositStatus.Withdrawn;   // effect first
usdc.safeTransfer(msg.sender, principal);   // interaction after
```

So even without the guard, a second entry finds `status != Active` and reverts with
`"not active"` — this also blocks plain double-withdraw. Our test
"blocks reentrancy on the _safeMint path (openDeposit)" arms a `MaliciousReceiver`
and asserts the reentrant `openDeposit` reverts.

---

## 8. Business Rules Checklist (Section 6)

1. **APR/penalty snapshotted at open, immutable per deposit** — stored as
   `aprBpsAtOpen` / `penaltyBpsAtOpen`; `updatePlan` touches only the plan, never
   existing deposits. ✔
2. **Simple interest only** — `_computeInterest`, no per-term compounding. ✔
3. **Early withdrawal: zero interest, penalty → feeReceiver.** ✔
4. **Auto-renew preserves original APR** — uses `aprBpsAtOpen`, not the current plan
   rate. ✔
5. **Interest always paid from the vault** — via `VaultManager.payInterest`; base
   rule improved by C1 (principal-safe) instead of a hard revert. ✔
6. **Paused ⇒ no withdrawals/renewals** (and we also block opens). ✔
7. **Admin cannot alter an open deposit** — no admin function writes the `deposits`
   mapping. ✔

---

## 9. How to Run

Prerequisites: Node.js 18+ and npm. From the `hardhat-temp/` directory (this
package's `package.json` lives here — the monorepo root has none):

```shell
# install dependencies
npm install

# compile contracts
npx hardhat compile

# run the full test suite
npx hardhat test

# run a single suite
npx hardhat test test/SavingCore.test.ts

# coverage report (target: > 90%)
npx hardhat coverage

# gas report
REPORT_GAS=1 npx hardhat test

# deploy locally (in-process Hardhat network); wires all three contracts
# and creates the default 180-day / 225-bps / 550-bps plan
npx hardhat deploy --network hardhat

# or against a persistent local node:
npx hardhat node            # terminal 1
npx hardhat deploy --network localhost   # terminal 2
```

---

## 10. Project Layout

```
contracts/
  MockUSDC.sol            # 6-decimal ERC-20 test token
  VaultManager.sol        # interest pool, payInterest, fee receiver, pause, timelock withdraw
  SavingCore.sol          # plans, deposits, ERC-721, withdraw/renew/auto-renew, claimInterest
  interfaces/
    IVaultManager.sol
  test/
    MaliciousReceiver.sol  # reentrancy attacker (tests only)
test/
  MockUSDC.test.ts
  VaultManager.test.ts
  SavingCore.test.ts
deploy/
  1-deploy.ts             # local deploy + default personal-variant plan
```

The full design spec and the task-by-task implementation plan live outside the
Hardhat package, under `../docs/specs/` and `../docs/plans/`.

---

## 11. Implementation Status

The design spec and the task-by-task implementation plan are complete and approved
(`../docs/specs/` and `../docs/plans/`). The contracts and tests are **implemented
and passing**: 78/78 tests green across `test/MockUSDC.test.ts`,
`test/VaultManager.test.ts`, and `test/SavingCore.test.ts`.

Statement / branch / function / line coverage per contract:

| Contract | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| `MockUSDC.sol` | 100% | 100% | 100% | 100% |
| `VaultManager.sol` | 100% | 100% | 100% | 100% |
| `SavingCore.sol` | 100% | 95.45% | 100% | 100% |

The system deploys locally via `npx hardhat deploy --network hardhat` (wires all
three contracts and creates the default 180-day / 225-bps / 550-bps plan; see §9).
The "Design Answers" in §7 quote the function names and exact `file:line` references
into the actual contract source (`require` statements, comparison operators, CEI
ordering) — read the cited lines directly in `contracts/SavingCore.sol` and
`contracts/VaultManager.sol` to verify them.
