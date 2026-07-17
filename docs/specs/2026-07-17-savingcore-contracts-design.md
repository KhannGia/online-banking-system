# SavingCore — Term Deposit System (Smart Contracts Design)

**Date:** 2026-07-17
**Scope:** Smart contracts sub-project (contracts + tests). Frontend is a separate spec.
**Student ID:** K234141651 → A (last digit) = 1, B (second-to-last digit) = 5

## 0. Personal Variant Values (Section 8.1)

These values are derived from the student ID and MUST be used consistently across contracts, tests, deploy scripts, README, and the demo video.

| Parameter | Formula | Value |
|---|---|---|
| Grace period (auto-renew) | (A mod 3) + 2 | **3 days** |
| Default plan APR | 200 + A×25 | **225 bps (2.25%)** |
| Early withdraw penalty | 300 + B×50 | **550 bps (5.50%)** |
| Default plan tenor | B odd → 180 | **180 days** |

## 1. Overview

A blockchain term-deposit ("online banking") system. Users lock ERC20 tokens into a saving plan for a fixed tenor, earn simple interest paid from a separate bank-owned vault, and receive a transferable ERC721 certificate. They can withdraw at maturity, withdraw early (with penalty, no interest), manually renew, or be auto-renewed by a permissionless keeper after a grace period.

Three required contracts, all built on OpenZeppelin v5:

- **MockUSDC.sol** — ERC20 test token, 6 decimals, open mint.
- **VaultManager.sol** — holds the bank's interest pool; admin money controls; pause; withdraw timelock.
- **SavingCore.sol** — plans, deposit lifecycle, ERC721 certificate NFT, all business logic.

**Key invariant:** SavingCore holds users' principal. VaultManager holds the bank's interest money. Interest is always paid from the vault, never from another user's principal. The two pools never mix.

## 2. Architecture & Contract Relationships

### 2.1 Deployment order and wiring

The two logic contracts reference each other, so deployment is ordered:

1. Deploy `MockUSDC`.
2. Deploy `VaultManager(usdc)`.
3. Deploy `SavingCore(usdc, vaultManager)` — receives the vault address in its constructor.
4. Call `vaultManager.setSavingCore(savingCore)` — one-time wiring.

`setSavingCore` only succeeds while the stored address is `address(0)`. Once set, it cannot be changed. This prevents a compromised/malicious owner from later re-pointing the vault's `payInterest` authorization at a different contract to drain funds.

### 2.2 Money flow

- `openDeposit`: user's USDC → SavingCore (principal held).
- `withdrawAtMaturity`: SavingCore returns principal (from its own balance) + calls `VaultManager.payInterest` to send interest to the user.
- `earlyWithdraw`: SavingCore returns `principal − penalty` to user; penalty → `feeReceiver`. No vault interaction.
- `renew`: interest is compounded into new principal; the interest portion is pulled from the vault into SavingCore.
- Vault is funded/withdrawn only by admin via `fundVault` / `withdrawVault`.

### 2.3 Contract responsibilities

**MockUSDC** — `ERC20`, `decimals()` returns 6, `mint(to, amount)` callable by anyone (test token only).

**VaultManager** — `Ownable`, `Pausable`.
- State: `usdc`, `savingCore`, `feeReceiver`, timelock fields.
- `setSavingCore(addr)` — onlyOwner, one-time.
- `fundVault(amount)` — onlyOwner, pulls USDC from owner into vault.
- `payInterest(to, amount) → paid` — **onlySavingCore**. Transfers `min(amount, balance)` to `to` and returns the actual amount paid. **Never reverts on insufficient funds** — this is the mechanism enabling bonus C1.
- `setFeeReceiver(addr)` — onlyOwner.
- `pause()` / `unpause()` — onlyOwner. Pausing blocks `payInterest` (so it transitively blocks vault-dependent withdraw/renew in SavingCore).
- `scheduleWithdrawVault(amount)` / `executeWithdrawVault()` / `cancelScheduledWithdrawal()` — timelocked admin withdrawal (bonus F, Section 8).
- `vaultBalance() → uint256` view.

**SavingCore** — `ERC721`, `Ownable`, `ReentrancyGuard`.
- Holds principal, owns all plan and deposit state, mints certificate NFTs.
- Calls into VaultManager for every interest payout.

## 3. Data Model

```solidity
struct Plan {
    uint256 tenorDays;
    uint256 aprBps;
    uint256 minDeposit;               // 0 = no lower limit
    uint256 maxDeposit;               // 0 = no upper limit
    uint256 earlyWithdrawPenaltyBps;
    bool    enabled;
}

enum DepositStatus { Active, Withdrawn, ManualRenewed, AutoRenewed }

struct Deposit {
    uint256 planId;
    uint256 principal;
    uint256 startAt;
    uint256 maturityAt;
    uint256 aprBpsAtOpen;             // snapshot — immutable per deposit
    uint256 penaltyBpsAtOpen;         // snapshot — immutable per deposit
    uint256 tenorDaysAtOpen;          // snapshot — needed for auto-renew (same tenor)
    DepositStatus status;
    uint256 pendingInterest;          // C1: interest owed but not yet paid (vault was short)
}
```

- `plans[]` array indexed by `planId`; `nextPlanId` counter.
- `deposits` mapping `depositId → Deposit`; `nextDepositId` counter (also the ERC721 tokenId).
- NFT `ownerOf(depositId)` is the sole authority for actions on that deposit. Whoever holds the certificate can withdraw/renew (answers Open Question #1).

## 4. Interest & Penalty Math

Simple interest, snapshot APR:

```
tenorSeconds = tenorDaysAtOpen × 86400
interest = mulDiv(principal, aprBpsAtOpen × tenorSeconds, 365 days × 10000)
```

- Use OpenZeppelin `Math.mulDiv` — multiply-before-divide in a single full-precision operation, no intermediate overflow, matches the "Precision tip" (multiply before divide).
- `365 days` in Solidity = `365 × 86400 = 31_536_000` seconds.

Penalty:

```
penalty = mulDiv(principal, penaltyBpsAtOpen, 10000)
userReceives = principal − penalty
```

Verification against the spec example (1,000 USDC = 1e9 units, 90 days, 250 bps):
`mulDiv(1e9, 250 × 7_776_000, 31_536_000 × 10000) = 6_164_383` units ≈ 6.16 USDC. Matches.

## 5. User Flows

### 5.1 openDeposit(planId, amount)

1. `whenNotPaused` (see Section 9 — we block opens when the system-level pause is on).
2. Require plan exists and `plan.enabled`.
3. Require `amount >= minDeposit` (if minDeposit > 0) and `amount <= maxDeposit` (if maxDeposit > 0).
4. `usdc.transferFrom(msg.sender, address(this), amount)`.
5. Snapshot plan values into a new `Deposit` with status `Active`, `startAt = now`, `maturityAt = now + tenorDays × 86400`.
6. `_safeMint(msg.sender, depositId)`.
7. Emit `DepositOpened`.

### 5.2 withdrawAtMaturity(depositId)

1. `whenNotPaused`, `nonReentrant`.
2. Require `ownerOf(depositId) == msg.sender`.
3. Require `deposit.status == Active`.
4. Require `block.timestamp >= maturityAt` (`>=` → the exact maturity second counts as "at maturity", not early).
5. Compute `interest`.
6. **Effects first (CEI):** set `status = Withdrawn`.
7. Interactions: `usdc.transfer(owner, principal)`; `paid = vault.payInterest(owner, interest)`; if `paid < interest`, set `deposit.pendingInterest = interest − paid` (C1).
8. Emit `Withdrawn(depositId, owner, principal, paid, isEarly=false)`.

### 5.3 earlyWithdraw(depositId)

1. `whenNotPaused`, `nonReentrant`.
2. Owner check; `status == Active`.
3. Require `block.timestamp < maturityAt`.
4. `penalty = mulDiv(principal, penaltyBpsAtOpen, 10000)`.
5. Effects: `status = Withdrawn`.
6. Interactions: `usdc.transfer(owner, principal − penalty)`; `usdc.transfer(feeReceiver, penalty)`. No interest, no vault call.
7. Emit `Withdrawn(depositId, owner, principal, 0, isEarly=true)`.

### 5.4 renewDeposit(depositId, newPlanId)  — manual

1. `whenNotPaused`, `nonReentrant`.
2. Owner check; `status == Active`.
3. Require `block.timestamp >= maturityAt` (no upper bound — manual renew remains possible even after grace period, until a keeper auto-renews first).
4. Require `newPlan.enabled` — cannot manually renew INTO a disabled plan (answers Open Question #6).
5. `interest = computeInterest(oldDeposit)`.
6. `paid = vault.payInterest(address(this), interest)` — interest pulled into SavingCore to be compounded. `shortfall = interest − paid`.
7. `newPrincipal = oldPrincipal + paid` (only actually-received interest compounds; shortfall recorded as pending on the OLD deposit's NFT so the user can still claim it).
8. Old deposit `status = ManualRenewed`.
9. Mint new deposit NFT with `newPlan`'s snapshotted APR/penalty/tenor, `maturityAt = now + newTenor`.
10. Emit `Renewed(oldDepositId, newDepositId, newPrincipal, newPlanId)`.

### 5.5 autoRenewDeposit(depositId)  — permissionless keeper (bonus G)

1. `whenNotPaused`, `nonReentrant`.
2. **No owner check, no caller restriction** — anyone may call.
3. Require `deposit.status == Active`.
4. Require `block.timestamp >= maturityAt + gracePeriod` (`>=` → callable exactly at grace-period end).
5. Uses the ORIGINAL snapshot values (same tenor, `aprBpsAtOpen`, `penaltyBpsAtOpen`) — does NOT read the current plan, so it does not check `plan.enabled` (it continues old terms, it doesn't open under a plan).
6. `interest = computeInterest(oldDeposit)`.
7. `keeperReward = mulDiv(interest, keeperRewardBps, 10000)`.
8. Pull `interest` for compounding + `keeperReward` for the caller from the vault, as two sequential `payInterest` calls. Both come from the vault (never from principal). If the vault is short, apply C1 semantics: pay what's available, record shortfall as pending. Because the interest call is made first and drains the vault before the reward call is attempted, the user's interest always has priority; the keeper reward call then receives whatever the vault has left — in full, partially, or not at all if the vault is now empty. A partial reward still incentivizes keepers rather than paying nothing, and never comes at the user's expense.
9. `newPrincipal = oldPrincipal + interestPaidToPrincipal`.
10. Old deposit `status = AutoRenewed`; mint new NFT to the SAME owner (`ownerOf(oldDepositId)`), same tenor, original APR/penalty.
11. Emit `Renewed(...)`.

### 5.6 claimInterest(depositId)  — bonus C1 tail

1. `whenNotPaused`, `nonReentrant`.
2. Owner check on the NFT (the NFT is not burned on withdraw/renew, so it still resolves an owner and carries `pendingInterest`).
3. Require `deposit.pendingInterest > 0`.
4. `paid = vault.payInterest(owner, pendingInterest)`; `pendingInterest -= paid`.
5. Emit an event (`InterestClaimed`).

## 6. Time-boundary Rules (Open Question #5)

| Action | Condition | Operator | Rationale |
|---|---|---|---|
| earlyWithdraw | `now < maturityAt` | `<` | Strictly before maturity is early. |
| withdrawAtMaturity | `now >= maturityAt` | `>=` | The exact maturity second is "at maturity", not early. |
| renewDeposit (manual) | `now >= maturityAt` | `>=` | Renew allowed from maturity onward, no upper bound. |
| autoRenewDeposit | `now >= maturityAt + grace` | `>=` | Callable exactly at grace-period end. |

## 7. Admin Functions

On VaultManager (all `onlyOwner` unless noted):
- `fundVault(amount)`, `scheduleWithdrawVault(amount)` / `executeWithdrawVault()` / `cancelScheduledWithdrawal()` (timelocked), `setFeeReceiver(addr)`, `pause()` / `unpause()`, `setSavingCore(addr)` (one-time).

On SavingCore (all `onlyOwner`):
- `createPlan(tenorDays, aprBps, minDeposit, maxDeposit, penaltyBps)` → emits `PlanCreated`. Validation: `tenorDays > 0`, `0 < aprBps <= MAX_APR_BPS` (MAX_APR_BPS = 10000 = 100%), `penaltyBps <= 10000`, and if both limits set, `maxDeposit >= minDeposit`. "Invalid APR" = `aprBps == 0` or `aprBps > MAX_APR_BPS` → revert.
- `updatePlan(planId, newAprBps)` → affects only NEW deposits; same APR validation; emits `PlanUpdated`.
- `enablePlan(planId)` / `disablePlan(planId)`.
- `setKeeperRewardBps(bps)` (bonus G).

Admin can never modify an existing deposit (Business Rule #7). No admin function touches the `deposits` mapping.

## 8. Bonus Challenges

### 8.1 C1 — Principal always safe (Open Question #2)

Instead of reverting when the vault can't cover interest, `payInterest` pays what it can and returns the paid amount. Principal is always returned in full immediately. The shortfall is recorded in `deposit.pendingInterest`; the NFT is not burned so it remains a claim ticket. `claimInterest(depositId)` lets the holder collect the remainder once the vault is refunded. Applied uniformly to `withdrawAtMaturity`, `renewDeposit`, and `autoRenewDeposit`. Trade-off: the bank still owes the interest (tracked as an on-chain liability) rather than the user's funds being frozen; slightly more state per deposit.

### 8.2 G — Permissionless keeper incentive (Open Question #3)

`autoRenewDeposit` is callable by anyone. The caller earns `keeperReward = mulDiv(interest, keeperRewardBps, 10000)`, paid from the vault on top of the user's interest, never from principal. If the official bot dies, any third party (or the user themselves) is economically incentivized to trigger auto-renew, so deposits don't stall. Trade-off: a small slice of vault yield goes to keepers; the user is fully protected (keeps original APR + full interest, unaffected by the reward).

### 8.3 F — Timelock on withdrawVault

`withdrawVault` is split into `scheduleWithdrawVault(amount)` → wait `TIMELOCK_DELAY` (constant, 2 days) → `executeWithdrawVault()`, with `cancelScheduledWithdrawal()` to abort. One pending withdrawal at a time. `pause()` is intentionally NOT timelocked (emergency stop must be instant). Trade-off: admin can't instantly drain the interest pool; users/keepers get a warning window. Adds a small schedule/execute state machine.

## 9. Pause Semantics (design choice beyond minimum)

The spec requires pause to block withdrawals and renewals. We additionally block `openDeposit` when paused: pausing is a system-wide emergency stop, and accepting new principal during an incident is unsafe. This is stricter than the minimum and will be documented in the README as an intentional extension. `claimInterest` is also blocked while paused (it's a vault payout).

**Decision:** SavingCore is `Pausable` with its own `pause()`/`unpause()` (onlyOwner), guarding `openDeposit`, `withdrawAtMaturity`, `earlyWithdraw`, `renewDeposit`, `autoRenewDeposit`, and `claimInterest`. VaultManager independently pauses `payInterest`. Both are controlled by the same owner address. This keeps each contract's guard self-contained and testable in isolation; a full emergency stop is achieved by pausing SavingCore (which gates every user entry point). The vault's own pause is defense-in-depth on the payout path.

## 10. Security (Open Question #7)

- All value-moving functions are `nonReentrant`.
- Checks-Effects-Interactions: `deposit.status` is set before any external call. This blocks double-withdraw independently of the reentrancy guard (defense in depth): a reentrant call re-entering `withdrawAtMaturity` would find `status != Active` and revert.
- The documented attack for the README: reentrancy on withdraw via a malicious ERC721 receiver or malicious token — stopped by both `nonReentrant` and the status-before-transfer ordering. Cited with the exact lines.
- `payInterest` is `onlySavingCore`; `setSavingCore` is one-time — external actors can't drain the vault.

## 11. Required Events (Section 5 of assignment)

```
PlanCreated(planId, tenorDays, aprBps)
PlanUpdated(planId, newAprBps)
DepositOpened(depositId, owner, planId, principal, maturityAt, aprBpsAtOpen)
Withdrawn(depositId, owner, principal, interest, isEarly)
Renewed(oldDepositId, newDepositId, newPrincipal, newPlanId)
```
Plus (our additions): `InterestClaimed(depositId, owner, amount)`, `KeeperRewardPaid(depositId, keeper, amount)`, `VaultWithdrawScheduled(amount, executeAfter)`, `VaultWithdrawExecuted(amount)`, `VaultWithdrawCancelled()`, `Funded(amount)`.

## 12. Open-Question Answers (to be written in README, summarized here)

1. **Transferable certificate:** whoever holds the NFT can act; `ownerOf(depositId) == msg.sender` is the deciding line. Bob (buyer) can withdraw. Reasonable — the certificate IS the claim; dangerous only if users don't understand a sale transfers withdrawal rights.
2. **Empty vault:** base spec reverts; we chose C1 (pay principal now, owe interest via `pendingInterest` + `claimInterest`). Chosen because freezing a user's own principal over the bank's liability is unfair.
3. **Dead bot:** deposits past grace sit as `Active` earning nothing extra; the user loses nothing structurally but loses the compounding they'd have gotten. Our fix: permissionless keeper reward (bonus G) so anyone can trigger it.
4. **Rounding dust:** integer division truncates down; leftover stays in the vault (bank keeps dust). Never over-pays, so never reverts on dust. Proven by a dedicated test.
5. **Boundary times:** operators table in Section 6.
6. **Disabled plan:** holders can still withdraw (at maturity / early), auto-renew (original terms), and claim; they can manually renew only INTO an enabled plan. Disabling closes new principal intake under that plan.
7. **Attack:** reentrancy on withdraw — stopped by `nonReentrant` + CEI status ordering.

## 13. Testing Plan (coverage > 90%)

Required cases (Section 7.2) plus bonus cases:
- **createPlan:** valid, disabled-on-create toggle, invalid APR (e.g. 0 or absurd), only-owner.
- **openDeposit:** happy path, below min, above max, disabled plan, paused.
- **withdrawAtMaturity:** correct interest (using 225 bps / 180 days variant), exactly at maturity second, too early revert, already withdrawn revert, non-owner revert.
- **earlyWithdraw:** correct 550 bps penalty, zero interest, feeReceiver credited.
- **renewDeposit (manual):** correct new principal = old + interest, status → ManualRenewed, into disabled plan reverts, before maturity reverts.
- **autoRenewDeposit:** before grace reverts, at/after grace passes, APR locked to original, permissionless caller, keeper reward paid, same-owner mint.
- **Vault:** fund, timelocked withdraw (schedule → too-early execute reverts → after-delay execute passes → cancel), insufficient vault → C1 pending-interest path + later claimInterest.
- **Pause:** withdraw/renew/open blocked when paused.
- **Dust:** small deposit, assert on-chain interest == floor(off-chain), vault decremented exactly.
- **Security:** reentrancy attempt via malicious token/receiver reverts.

Test stack: Hardhat + ethers v6 + `@nomicfoundation/hardhat-network-helpers` (time travel) + solidity-coverage. TypeScript.

## 14. Out of Scope (this spec)

- React frontend (separate spec).
- README prose / demo video (produced after contracts are green).
- Deploy scripts to public testnet (local Hardhat deploy is included; Sepolia optional).
