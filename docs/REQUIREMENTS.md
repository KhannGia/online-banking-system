# Requirements Traceability

Maps every requirement in `Final_Assignment.docx.pdf` to the code that implements it and the
tests that verify it. Line references point at the current `main`; if you refactor, re-check them.

**Student ID K234141651** → A=1, B=5 → grace **3 days**, APR **225 bps**, penalty **550 bps**,
tenor **180 days** (assignment §8.1).

Legend: `SC` = `contract/contracts/SavingCore.sol`, `VM` = `contract/contracts/VaultManager.sol`,
`MU` = `contract/contracts/MockUSDC.sol`, tests under `contract/test/`.

---

## §3 — User flows

| # | Flow | Implementation | Tests |
|---|---|---|---|
| 3.1 | Open a deposit | `SC:132` `openDeposit(planId, amount)` — validates plan enabled (`SC:140`), rejects a zero amount (`SC:141`) and min/max, pulls principal, snapshots APR/penalty/tenor, `_safeMint`s the certificate | `SavingCore.test.ts:147` `describe("openDeposit")` |
| 3.2 | Withdraw at maturity | `SC:184` `withdrawAtMaturity` — interest from `_computeInterest` (`SC:350`), principal from SavingCore, interest from the vault | `SavingCore.test.ts:207` |
| 3.3 | Early withdrawal | `SC:209` `earlyWithdraw` — zero interest, penalty from the snapshot to `feeReceiver` | `SavingCore.test.ts:312` |
| 3.4 | Manual renew | `SC:249` `renewDeposit(depositId, newPlanId)` — compounds interest into new principal, adopts the **new** plan's rates, requires target plan enabled (`SC:261`) | `SavingCore.test.ts:354` |
| 3.5 | Auto renew | `SC:284` `autoRenewDeposit(depositId)` — permissionless, after `maturityAt + GRACE_PERIOD` (`SC:292`), **locks the original APR**, mints to the original owner | `SavingCore.test.ts:455` |

Interest formula (assignment §3.2), `SC:350`:
`Math.mulDiv(principal, aprBpsAtOpen * tenorSeconds, SECONDS_PER_YEAR * BPS_DENOMINATOR)` —
multiply-before-divide in one full-precision operation. Verified against the assignment's own
worked example (1e9 @ 250 bps / 90 days → 6,164,383) and this variant (1e9 @ 225 bps / 180 days
→ 11,095,890).

---

## §4 — Admin functions

| Function | Implementation | Tests |
|---|---|---|
| `createPlan(...)` | `SC:78` | `SavingCore.test.ts:47` `describe("plan management")` |
| `updatePlan(planId, newAprBps)` | `SC:96` — affects new deposits only; wired into the Admin tab's per-plan "New APR" control (`frontend/src/components/AdminPanel.tsx`) | `SavingCore.test.ts:47`; immutability proven in `describe("openDeposit")` |
| `enablePlan` / `disablePlan` | `SC:103` / `SC:109` | `SavingCore.test.ts:47` |
| `fundVault(amount)` | `VM:57` | `VaultManager.test.ts:8` |
| `withdrawVault(amount)` | **Timelocked** (bonus F): `VM:84` schedule → `VM:93` execute → `VM:106` cancel, `TIMELOCK_DELAY = 2 days` (`VM:20`) | `VaultManager.test.ts:93` `describe("timelock withdraw")` |
| `setFeeReceiver(address)` | `VM:51` | `VaultManager.test.ts:8` |
| `pause()` / `unpause()` | `SC:359`/`SC:363` and `VM:113`/`VM:117` (independent per contract) | `SavingCore.test.ts:134`, `VaultManager.test.ts:8` |

Extra: `setKeeperRewardBps` (`SC:115`) configures the bonus-G keeper reward.

---

## §5 — Required events

All five required events are declared and emitted:

| Event | Declaration |
|---|---|
| `PlanCreated(planId, tenorDays, aprBps)` | `SC:56` |
| `PlanUpdated(planId, newAprBps)` | `SC:57` |
| `DepositOpened(depositId, owner, planId, principal, maturityAt, aprBpsAtOpen)` | `SC:61` |
| `Withdrawn(depositId, owner, principal, interest, isEarly)` | `SC:62` |
| `Renewed(oldDepositId, newDepositId, newPrincipal, newPlanId)` | `SC:63` |

Additional events for our own features: `PlanEnabled`/`PlanDisabled` (`SC:58-59`),
`KeeperRewardUpdated` (`SC:60`), `InterestClaimed` (`SC:64`), `KeeperRewardPaid` (`SC:65`),
and on VaultManager `Funded`, `FeeReceiverUpdated`, `InterestPaid`, `SavingCoreSet`,
`VaultWithdrawScheduled`/`Executed`/`Cancelled` (`VM:24-30`).

---

## §6 — Business rules

| # | Rule | Where it holds |
|---|---|---|
| 1 | APR/penalty snapshotted at open; admin changes never affect existing deposits | `Deposit` struct fields `aprBpsAtOpen`/`penaltyBpsAtOpen`/`tenorDaysAtOpen` (`SC:39`), written once in `openDeposit` (`SC:132`). Test: snapshot-immutability case in `describe("openDeposit")` |
| 2 | Simple interest only, no intra-term compounding | `_computeInterest` (`SC:350`) — a single closed-form calculation |
| 3 | Early withdrawal gives zero interest; penalty → `feeReceiver` | `SC:209` (emits `Withdrawn` with `interest = 0`) |
| 4 | Auto-renew preserves the original APR | `SC:284` passes `d.aprBpsAtOpen`, never reads the current plan |
| 5 | Interest always paid from the vault | Every interest path calls `VM:64` `payInterest` through `_payInterestSafe` (`SC:175`); principal never funds interest. **Improved by bonus C1** (below) rather than reverting on shortfall **or** on a paused vault |
| 6 | Paused ⇒ no withdrawals or renewals | `whenNotPaused` on every SavingCore entry point; `VM:64` `payInterest` is separately pausable, but a paused vault no longer blocks SavingCore's own withdraw/renew paths — see `_payInterestSafe` (`SC:175`) |
| 7 | Admin cannot alter an open deposit | No admin function writes the `deposits` mapping (verified in the final code review) |

---

## §7 — Deliverables

| Deliverable | Status |
|---|---|
| 7.1 `MockUSDC.sol` — ERC-20, 6 decimals, mintable | `MU` — `decimals()` returns 6, open `mint` |
| 7.1 `VaultManager.sol` — funding, fee receiver, pause | `VM` |
| 7.1 `SavingCore.sol` — plans, deposits, withdraw, renew (manual + auto), ERC-721 | `SC` |
| 7.2 Test suite, coverage > 90% | **82 tests passing.** Coverage: MockUSDC 100/100/100/100, VaultManager 100/100/100/100, SavingCore 100 stmts / 95.54 branches / 100 funcs / 100 lines |
| 7.3 React frontend (MetaMask, view plans, open deposit, view deposits, withdraw/renew) | `frontend/` — all four required capabilities plus the bonus actions and an owner-only Admin tab. 61 frontend tests |
| 7.4 "Design Answers" section in README | [`contract/README.md`](../contract/README.md) §7 |

### §7.2 minimum test cases

| Required case | Test location |
|---|---|
| createPlan: valid, disabled, invalid APR | `SavingCore.test.ts:47` |
| openDeposit: happy path, below min, above max, zero amount, disabled plan | `SavingCore.test.ts:147` |
| withdrawAtMaturity: correct interest, too early, already withdrawn | `SavingCore.test.ts:207` |
| earlyWithdraw: correct penalty, no interest | `SavingCore.test.ts:312` |
| renewDeposit: correct new principal, status update | `SavingCore.test.ts:354` |
| autoRenewDeposit: before grace fails, after grace, APR locked | `SavingCore.test.ts:455` + `:468` (exact `>=` boundary) |
| Vault: fund, withdraw, insufficient vault for payout | `VaultManager.test.ts:8`, `:93`; shortfall in the C1 blocks (`SavingCore.test.ts:261`, `:406`, `:552`) |
| Pause: withdraw blocked when paused | `SavingCore.test.ts:134` + paused cases in each flow's describe; vault-paused-not-underfunded cases at `:292`, `:439`, `:599` |

---

## §8.2 — Open questions (answers in `contract/README.md` §7)

| Q | Topic | Key code |
|---|---|---|
| 1 | Transferable certificate — who can withdraw | `SC:165` `_requireOwner`: `require(ownerOf(depositId) == msg.sender, "not owner")` |
| 2 | Empty vault | Bonus C1 — `VM:64` `payInterest` never reverts on shortfall; wrapped in `try/catch` (`_payInterestSafe`, `SC:175`) so a **paused** vault degrades the same way; shortfall recorded as `pendingInterest`, claimable via `SC:235` `claimInterest` |
| 3 | Dead bot | Bonus G — `SC:284` `autoRenewDeposit` is permissionless and pays a keeper reward. Reference bot: `contract/scripts/keeper-bot.ts` (`npm run keeper:sepolia`) |
| 4 | Rounding dust | `Math.mulDiv` floors; the remainder is never created as an obligation, so it stays in the vault and can never cause a revert. Test: `SavingCore.test.ts:643` |
| 5 | Boundary times | `SC:192` `>=` maturity (withdraw), `SC:217` `<` maturity (early), `SC:258` `>=` maturity (renew, no upper bound), `SC:292` `>=` maturity+grace (auto-renew). Exact-second tests: `SavingCore.test.ts:468` |
| 6 | Disabled plan with active deposits | `SC:261` blocks manual renew **into** a disabled plan; auto-renew deliberately never reads `enabled`; withdraw/claim unaffected |
| 7 | Attack thinking | Reentrancy via `_safeMint` → `onERC721Received`; stopped by `nonReentrant` **and** CEI status ordering (`SC:198`, `SC:223`, `SC:267`, `SC:298` — status set before every external call). Test: `SavingCore.test.ts:621` with `contracts/test/MaliciousReceiver.sol` |

---

## §8.3 — Creative challenges (bonus)

| ID | Challenge | Implementation | Tests |
|---|---|---|---|
| **C1** | Principal is always safe | `VM:64` `payInterest` pays `min(amount, balance)` and never reverts on shortfall; every caller in `SC` goes through `_payInterestSafe` (`SC:175`), which also catches a **paused**-vault revert the same way; principal is always returned first; shortfall → `pendingInterest`; NFT not burned; `SC:235` `claimInterest` collects later, repeatably | Underfunded vault: `SavingCore.test.ts:261` (withdraw), `:406` (renew), `:552` (auto-renew). Paused vault (same guarantee, different cause): `:292`, `:439`, `:599` |
| **F** | Timelocked vault withdrawal *(own idea)* | `VM:84`/`:93`/`:106` schedule → wait `TIMELOCK_DELAY` (2 days) → execute, with cancel. `pause()` deliberately **not** timelocked | `VaultManager.test.ts:93` |
| **G** | Permissionless keeper incentive *(own idea)* | `SC:284` callable by anyone; reward = `mulDiv(interest, keeperRewardBps, 10000)` paid from the vault **on top of** the user's interest; user's interest has priority (paid first, structurally); reference bot at `contract/scripts/keeper-bot.ts` | `SavingCore.test.ts:455`, incl. a partial-funding case proving priority |

Bonus rules satisfied: base flows still pass, each challenge has its own tests, and each is
documented with problem → solution → trade-off in [`contract/README.md`](../contract/README.md) §5.

---

## §9 — Evaluation criteria

| Criterion | Points | Evidence |
|---|---|---|
| Correct interest & penalty math | 20 | `SC:350`; worked examples verified in README §4 and in tests |
| APR/penalty snapshot immutability | 15 | `SC:39` + snapshot test |
| Auto-renew with APR lock & grace period | 15 | `SC:284`, `GRACE_PERIOD = 3 days` (`SC:23`), boundary tests `SavingCore.test.ts:468` |
| Vault management & pause/unpause | 10 | `VM`, `VaultManager.test.ts` |
| Test coverage > 90% | 15 | 100/100/100 and 100/95.54/100/100 — see README |
| Open questions + oral defense | 10 | `contract/README.md` §7, with exact line citations |
| Frontend demo | 10 | `frontend/` — see its README feature tour |
| Code quality & event emissions | 5 | NatSpec throughout, event per state change, CEI + `nonReentrant` |

---

## §11 — Submission checklist

- [x] GitHub repository with all source code
- [x] README explaining how to run tests and deploy locally — root [`README.md`](../README.md) and [`contract/README.md`](../contract/README.md)
- [x] "Design Answers" section — `contract/README.md` §7
- [x] Personal variant values at the top of the README
- [ ] **Demo video (3–5 minutes)** — still to record; numbers on screen must match the variant values above
