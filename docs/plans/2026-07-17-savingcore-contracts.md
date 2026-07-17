# SavingCore Contracts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the three-contract term-deposit banking system (MockUSDC, VaultManager, SavingCore) with 90%+ test coverage, using the student's personal-variant values (K234141651).

**Architecture:** SavingCore (ERC721 + Ownable + Pausable + ReentrancyGuard) holds user principal and all deposit lifecycle logic; it calls VaultManager (Ownable + Pausable) to pay interest from a separate bank-owned pool; MockUSDC is a 6-decimal ERC20 test token. Interest is simple-interest, snapshotted per deposit. Three bonuses: C1 (principal always safe via `pendingInterest`/`claimInterest`), G (permissionless keeper reward on auto-renew), F (timelock on vault withdrawal).

**Tech Stack:** Solidity 0.8.28 (viaIR), OpenZeppelin Contracts 5.3.0, Hardhat, ethers v6, TypeChain, `@nomicfoundation/hardhat-network-helpers`, solidity-coverage, TypeScript + chai.

## Global Constraints

- Solidity pragma: `^0.8.28`. SPDX: `MIT`.
- All token amounts in base units. MockUSDC = 6 decimals → 1 USDC = 1_000_000 units.
- Personal-variant values (must appear in default plan, tests, deploy): grace period = **3 days** (259_200 s), default plan APR = **225 bps**, early withdraw penalty = **550 bps**, default tenor = **180 days**.
- Interest formula: `interest = Math.mulDiv(principal, aprBpsAtOpen * tenorSeconds, 365 days * 10000)` where `tenorSeconds = tenorDaysAtOpen * 86400` and `365 days = 31_536_000`.
- Penalty formula: `penalty = Math.mulDiv(principal, penaltyBpsAtOpen, 10000)`.
- Constants: `BPS_DENOMINATOR = 10000`, `SECONDS_PER_DAY = 86400`, `SECONDS_PER_YEAR = 365 days`, `MAX_APR_BPS = 10000`, `TIMELOCK_DELAY = 2 days`.
- Every value-moving function is `nonReentrant`; effects (status change) happen before external calls (CEI).
- Interest is ALWAYS paid from VaultManager, NEVER from principal held in SavingCore.
- Use OpenZeppelin: `token/ERC721/ERC721.sol`, `access/Ownable.sol`, `utils/Pausable.sol`, `utils/ReentrancyGuard.sol`, `utils/math/Math.sol`, `token/ERC20/ERC20.sol`, `token/ERC20/IERC20.sol`, `token/ERC20/utils/SafeERC20.sol`.
- Ownable constructor takes `initialOwner` in OZ v5: `Ownable(msg.sender)`.
- Run tests: `npx hardhat test`. Coverage: `npx hardhat coverage`. Compile: `npx hardhat compile`.
- Working directory for all commands: `/home/khangia/capstone/hardhat-temp`.

## File Structure

```
hardhat-temp/
  contracts/
    MockUSDC.sol            # ERC20, 6 decimals, open mint
    VaultManager.sol        # interest pool, payInterest, fee receiver, pause, timelock withdraw
    SavingCore.sol          # plans, deposits, ERC721, withdraw/renew/auto-renew, claimInterest
    interfaces/
      IVaultManager.sol     # minimal interface SavingCore uses
    test/
      MaliciousReceiver.sol # attacker contract for reentrancy test
  test/
    MockUSDC.test.ts
    VaultManager.test.ts
    SavingCore.test.ts      # deposit lifecycle + integration + security
  deploy/
    1-deploy.ts             # local deploy: usdc → vault → core → wire → default plan
```

`contracts/Counter.sol` and `test/Counter.test.ts` are removed in Task 1.

---

### Task 1: Remove template, add MockUSDC

**Files:**
- Delete: `contracts/Counter.sol`, `test/Counter.test.ts`
- Create: `contracts/MockUSDC.sol`
- Test: `test/MockUSDC.test.ts`

**Interfaces:**
- Produces: `MockUSDC` — `constructor()`, `decimals() → uint8 (6)`, `mint(address to, uint256 amount)`, standard ERC20.

- [ ] **Step 1: Remove template files**

```bash
cd /home/khangia/capstone/hardhat-temp
rm contracts/Counter.sol test/Counter.test.ts
```

- [ ] **Step 2: Write the failing test**

Create `test/MockUSDC.test.ts`:

```typescript
import "@nomicfoundation/hardhat-ethers";
import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { MockUSDC } from "../typechain";

describe("MockUSDC", function () {
  let deployer: SignerWithAddress, user: SignerWithAddress;
  let usdc: MockUSDC;

  beforeEach(async () => {
    [deployer, user] = await ethers.getSigners();
    usdc = await (await ethers.getContractFactory("MockUSDC")).deploy();
  });

  it("has 6 decimals", async () => {
    expect(await usdc.decimals()).to.equal(6);
  });

  it("lets anyone mint", async () => {
    await usdc.connect(user).mint(user.address, 1_000_000n);
    expect(await usdc.balanceOf(user.address)).to.equal(1_000_000n);
  });

  it("has name and symbol", async () => {
    expect(await usdc.name()).to.equal("Mock USDC");
    expect(await usdc.symbol()).to.equal("mUSDC");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx hardhat test test/MockUSDC.test.ts`
Expected: FAIL — cannot find artifact / `MockUSDC` not compiled.

- [ ] **Step 4: Write MockUSDC.sol**

Create `contracts/MockUSDC.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockUSDC
/// @notice 6-decimal ERC20 test token. Anyone can mint. Testing only.
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "mUSDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice Open mint for testing. Not for production.
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx hardhat test test/MockUSDC.test.ts`
Expected: PASS (3 passing).

- [ ] **Step 6: Commit**

```bash
cd /home/khangia/capstone/hardhat-temp
git add contracts/MockUSDC.sol test/MockUSDC.test.ts
git rm --cached contracts/Counter.sol test/Counter.test.ts 2>/dev/null; true
git add -A
git commit -m "feat: add MockUSDC 6-decimal test token, remove Counter template"
```

---

### Task 2: VaultManager core (interface, wiring, fund, payInterest, feeReceiver, pause)

**Files:**
- Create: `contracts/interfaces/IVaultManager.sol`
- Create: `contracts/VaultManager.sol`
- Test: `test/VaultManager.test.ts`

**Interfaces:**
- Consumes: `MockUSDC` from Task 1.
- Produces:
  - `IVaultManager.payInterest(address to, uint256 amount) external returns (uint256 paid)`
  - `VaultManager` — `constructor(address usdc)`, `setSavingCore(address)`, `fundVault(uint256)`, `payInterest(address,uint256) → uint256`, `setFeeReceiver(address)`, `feeReceiver() → address`, `vaultBalance() → uint256`, `pause()`, `unpause()`, `savingCore() → address`, `usdc() → IERC20`.
  - Events: `Funded(uint256 amount)`, `FeeReceiverUpdated(address receiver)`, `InterestPaid(address to, uint256 amount)`, `SavingCoreSet(address core)`.

Note: To test `payInterest` in isolation (it is `onlySavingCore`), the test sets `savingCore` to an EOA signer via `setSavingCore(signer.address)` and calls from that signer. The real SavingCore wiring is exercised in Task 5+ integration.

- [ ] **Step 1: Write the failing test**

Create `test/VaultManager.test.ts`:

```typescript
import "@nomicfoundation/hardhat-ethers";
import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { MockUSDC, VaultManager } from "../typechain";

describe("VaultManager", function () {
  let owner: SignerWithAddress, core: SignerWithAddress, fee: SignerWithAddress, user: SignerWithAddress, other: SignerWithAddress;
  let usdc: MockUSDC;
  let vault: VaultManager;
  const M = 1_000_000n; // 1 USDC

  beforeEach(async () => {
    [owner, core, fee, user, other] = await ethers.getSigners();
    usdc = await (await ethers.getContractFactory("MockUSDC")).deploy();
    vault = await (await ethers.getContractFactory("VaultManager")).deploy(await usdc.getAddress());
    await usdc.mint(owner.address, 1000n * M);
    await usdc.connect(owner).approve(await vault.getAddress(), 1000n * M);
  });

  it("sets savingCore once and only by owner", async () => {
    await expect(vault.connect(user).setSavingCore(core.address)).to.be.reverted; // onlyOwner
    await vault.connect(owner).setSavingCore(core.address);
    expect(await vault.savingCore()).to.equal(core.address);
    await expect(vault.connect(owner).setSavingCore(other.address)).to.be.revertedWith("core already set");
  });

  it("funds the vault", async () => {
    await expect(vault.connect(owner).fundVault(100n * M)).to.emit(vault, "Funded").withArgs(100n * M);
    expect(await vault.vaultBalance()).to.equal(100n * M);
  });

  it("pays interest only from savingCore, capped at balance", async () => {
    await vault.connect(owner).setSavingCore(core.address);
    await vault.connect(owner).fundVault(10n * M);
    // non-core cannot call
    await expect(vault.connect(user).payInterest(user.address, 1n * M)).to.be.revertedWith("only saving core");
    // pays full when funded
    await vault.connect(core).payInterest(user.address, 4n * M);
    expect(await usdc.balanceOf(user.address)).to.equal(4n * M);
    // caps at remaining balance (6 left, ask 100 → pays 6), returns paid via state effect
    await vault.connect(core).payInterest(user.address, 100n * M);
    expect(await usdc.balanceOf(user.address)).to.equal(10n * M);
    expect(await vault.vaultBalance()).to.equal(0n);
  });

  it("does not pay interest when paused", async () => {
    await vault.connect(owner).setSavingCore(core.address);
    await vault.connect(owner).fundVault(10n * M);
    await vault.connect(owner).pause();
    await expect(vault.connect(core).payInterest(user.address, 1n * M)).to.be.reverted;
    await vault.connect(owner).unpause();
    await vault.connect(core).payInterest(user.address, 1n * M);
    expect(await usdc.balanceOf(user.address)).to.equal(1n * M);
  });

  it("sets fee receiver", async () => {
    await expect(vault.connect(owner).setFeeReceiver(fee.address)).to.emit(vault, "FeeReceiverUpdated").withArgs(fee.address);
    expect(await vault.feeReceiver()).to.equal(fee.address);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx hardhat test test/VaultManager.test.ts`
Expected: FAIL — `VaultManager` artifact not found.

- [ ] **Step 3: Write IVaultManager.sol**

Create `contracts/interfaces/IVaultManager.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IVaultManager {
    /// @notice Pay up to `amount` of interest to `to`. Returns the amount actually paid.
    /// @dev Never reverts on insufficient funds; pays min(amount, balance). Enables "principal always safe".
    function payInterest(address to, uint256 amount) external returns (uint256 paid);

    function feeReceiver() external view returns (address);

    function vaultBalance() external view returns (uint256);
}
```

- [ ] **Step 4: Write VaultManager.sol (core only; timelock added in Task 3)**

Create `contracts/VaultManager.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IVaultManager.sol";

/// @title VaultManager
/// @notice Holds the bank's interest pool, separate from user principal.
///         Only SavingCore may draw interest. Admin funds/withdraws (withdraw is timelocked).
contract VaultManager is IVaultManager, Ownable, Pausable {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    address public savingCore;
    address public feeReceiver;

    event Funded(uint256 amount);
    event FeeReceiverUpdated(address receiver);
    event InterestPaid(address to, uint256 amount);
    event SavingCoreSet(address core);

    modifier onlySavingCore() {
        require(msg.sender == savingCore, "only saving core");
        _;
    }

    constructor(address _usdc) Ownable(msg.sender) {
        require(_usdc != address(0), "usdc zero");
        usdc = IERC20(_usdc);
        feeReceiver = msg.sender;
    }

    /// @notice One-time wiring of the SavingCore address. Cannot be changed once set.
    function setSavingCore(address _core) external onlyOwner {
        require(savingCore == address(0), "core already set");
        require(_core != address(0), "core zero");
        savingCore = _core;
        emit SavingCoreSet(_core);
    }

    function setFeeReceiver(address _receiver) external onlyOwner {
        require(_receiver != address(0), "receiver zero");
        feeReceiver = _receiver;
        emit FeeReceiverUpdated(_receiver);
    }

    function fundVault(uint256 amount) external onlyOwner {
        require(amount > 0, "amount zero");
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        emit Funded(amount);
    }

    /// @inheritdoc IVaultManager
    function payInterest(address to, uint256 amount)
        external
        override
        onlySavingCore
        whenNotPaused
        returns (uint256 paid)
    {
        uint256 bal = usdc.balanceOf(address(this));
        paid = amount > bal ? bal : amount;
        if (paid > 0) {
            usdc.safeTransfer(to, paid);
            emit InterestPaid(to, paid);
        }
    }

    function vaultBalance() external view override returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx hardhat test test/VaultManager.test.ts`
Expected: PASS (5 passing).

- [ ] **Step 6: Commit**

```bash
cd /home/khangia/capstone/hardhat-temp
git add contracts/VaultManager.sol contracts/interfaces/IVaultManager.sol test/VaultManager.test.ts
git commit -m "feat: VaultManager core with capped payInterest and one-time core wiring"
```

---

### Task 3: VaultManager timelock withdrawal (bonus F)

**Files:**
- Modify: `contracts/VaultManager.sol`
- Test: `test/VaultManager.test.ts` (append a `describe` block)

**Interfaces:**
- Produces (added to VaultManager):
  - `scheduleWithdrawVault(uint256 amount)`, `executeWithdrawVault()`, `cancelScheduledWithdrawal()`
  - `pendingWithdrawAmount() → uint256`, `withdrawExecutableAt() → uint256`
  - `TIMELOCK_DELAY() → uint256` (constant, 2 days)
  - Events: `VaultWithdrawScheduled(uint256 amount, uint256 executeAfter)`, `VaultWithdrawExecuted(uint256 amount)`, `VaultWithdrawCancelled()`.

- [ ] **Step 1: Write the failing test**

Append to `test/VaultManager.test.ts` (before the final closing `});` of the outer describe):

```typescript
  describe("timelock withdraw", function () {
    const M = 1_000_000n;
    beforeEach(async () => {
      await vault.connect(owner).fundVault(100n * M);
    });

    it("requires schedule then delay then execute", async () => {
      const { time } = require("@nomicfoundation/hardhat-network-helpers");
      await expect(vault.connect(owner).executeWithdrawVault()).to.be.revertedWith("nothing scheduled");
      await expect(vault.connect(owner).scheduleWithdrawVault(30n * M))
        .to.emit(vault, "VaultWithdrawScheduled");
      // too early
      await expect(vault.connect(owner).executeWithdrawVault()).to.be.revertedWith("timelock not elapsed");
      await time.increase(2 * 24 * 3600);
      const before = await usdc.balanceOf(owner.address);
      await expect(vault.connect(owner).executeWithdrawVault())
        .to.emit(vault, "VaultWithdrawExecuted").withArgs(30n * M);
      expect(await usdc.balanceOf(owner.address)).to.equal(before + 30n * M);
      expect(await vault.vaultBalance()).to.equal(70n * M);
    });

    it("can cancel a scheduled withdrawal", async () => {
      await vault.connect(owner).scheduleWithdrawVault(30n * M);
      await expect(vault.connect(owner).cancelScheduledWithdrawal()).to.emit(vault, "VaultWithdrawCancelled");
      await expect(vault.connect(owner).executeWithdrawVault()).to.be.revertedWith("nothing scheduled");
    });

    it("only owner can schedule/execute/cancel", async () => {
      await expect(vault.connect(user).scheduleWithdrawVault(1n * M)).to.be.reverted;
      await vault.connect(owner).scheduleWithdrawVault(1n * M);
      await expect(vault.connect(user).executeWithdrawVault()).to.be.reverted;
      await expect(vault.connect(user).cancelScheduledWithdrawal()).to.be.reverted;
    });

    it("caps execution at current balance", async () => {
      const { time } = require("@nomicfoundation/hardhat-network-helpers");
      await vault.connect(owner).scheduleWithdrawVault(200n * M); // more than balance
      await time.increase(2 * 24 * 3600);
      const before = await usdc.balanceOf(owner.address);
      await vault.connect(owner).executeWithdrawVault();
      expect(await usdc.balanceOf(owner.address)).to.equal(before + 100n * M); // capped
      expect(await vault.vaultBalance()).to.equal(0n);
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx hardhat test test/VaultManager.test.ts`
Expected: FAIL — `scheduleWithdrawVault` is not a function.

- [ ] **Step 3: Add timelock code to VaultManager.sol**

Add these state variables after `address public feeReceiver;`:

```solidity
    uint256 public constant TIMELOCK_DELAY = 2 days;
    uint256 public pendingWithdrawAmount;
    uint256 public withdrawExecutableAt;
```

Add these events after `event SavingCoreSet(address core);`:

```solidity
    event VaultWithdrawScheduled(uint256 amount, uint256 executeAfter);
    event VaultWithdrawExecuted(uint256 amount);
    event VaultWithdrawCancelled();
```

Add these functions before `function pause()`:

```solidity
    /// @notice Schedule a vault withdrawal. Must wait TIMELOCK_DELAY before executing.
    function scheduleWithdrawVault(uint256 amount) external onlyOwner {
        require(amount > 0, "amount zero");
        pendingWithdrawAmount = amount;
        withdrawExecutableAt = block.timestamp + TIMELOCK_DELAY;
        emit VaultWithdrawScheduled(amount, withdrawExecutableAt);
    }

    /// @notice Execute a previously scheduled withdrawal after the timelock elapses.
    /// @dev Caps at current balance so it never reverts on rounding/underfund.
    function executeWithdrawVault() external onlyOwner {
        require(withdrawExecutableAt != 0, "nothing scheduled");
        require(block.timestamp >= withdrawExecutableAt, "timelock not elapsed");
        uint256 amount = pendingWithdrawAmount;
        uint256 bal = usdc.balanceOf(address(this));
        if (amount > bal) amount = bal;
        pendingWithdrawAmount = 0;
        withdrawExecutableAt = 0;
        if (amount > 0) usdc.safeTransfer(owner(), amount);
        emit VaultWithdrawExecuted(amount);
    }

    function cancelScheduledWithdrawal() external onlyOwner {
        require(withdrawExecutableAt != 0, "nothing scheduled");
        pendingWithdrawAmount = 0;
        withdrawExecutableAt = 0;
        emit VaultWithdrawCancelled();
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx hardhat test test/VaultManager.test.ts`
Expected: PASS (9 passing total).

- [ ] **Step 5: Commit**

```bash
cd /home/khangia/capstone/hardhat-temp
git add contracts/VaultManager.sol test/VaultManager.test.ts
git commit -m "feat: timelocked vault withdrawal (bonus F)"
```

---

### Task 4: SavingCore skeleton + plan management

**Files:**
- Create: `contracts/SavingCore.sol`
- Test: `test/SavingCore.test.ts`

**Interfaces:**
- Consumes: `MockUSDC`, `VaultManager`, `IVaultManager`.
- Produces (this task):
  - `constructor(address _usdc, address _vault)`
  - `createPlan(uint256 tenorDays, uint256 aprBps, uint256 minDeposit, uint256 maxDeposit, uint256 penaltyBps) → uint256 planId`
  - `updatePlan(uint256 planId, uint256 newAprBps)`
  - `enablePlan(uint256 planId)`, `disablePlan(uint256 planId)`
  - `plans(uint256) → (tenorDays, aprBps, minDeposit, maxDeposit, earlyWithdrawPenaltyBps, enabled)` (public mapping/array getter)
  - `planCount() → uint256`
  - `setKeeperRewardBps(uint256 bps)`, `keeperRewardBps() → uint256`
  - Constants: `MAX_APR_BPS() → uint256`, `GRACE_PERIOD() → uint256`, `BPS_DENOMINATOR() → uint256`.
  - Events: `PlanCreated(uint256 planId, uint256 tenorDays, uint256 aprBps)`, `PlanUpdated(uint256 planId, uint256 newAprBps)`, `PlanEnabled(uint256 planId)`, `PlanDisabled(uint256 planId)`, `KeeperRewardUpdated(uint256 bps)`.

- [ ] **Step 1: Write the failing test**

Create `test/SavingCore.test.ts`:

```typescript
import "@nomicfoundation/hardhat-ethers";
import { ethers } from "hardhat";
import { expect } from "chai";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { MockUSDC, VaultManager, SavingCore } from "../typechain";

const M = 1_000_000n; // 1 USDC (6 decimals)
const DAY = 86400;

// Personal variant (K234141651): A=1, B=5
const APR_BPS = 225n;
const PENALTY_BPS = 550n;
const TENOR_DAYS = 180n;
const GRACE_DAYS = 3;

describe("SavingCore", function () {
  let owner: SignerWithAddress, alice: SignerWithAddress, bob: SignerWithAddress, keeper: SignerWithAddress, fee: SignerWithAddress;
  let usdc: MockUSDC;
  let vault: VaultManager;
  let core: SavingCore;

  async function deployAll() {
    [owner, alice, bob, keeper, fee] = await ethers.getSigners();
    usdc = await (await ethers.getContractFactory("MockUSDC")).deploy();
    vault = await (await ethers.getContractFactory("VaultManager")).deploy(await usdc.getAddress());
    core = await (await ethers.getContractFactory("SavingCore")).deploy(await usdc.getAddress(), await vault.getAddress());
    await vault.setSavingCore(await core.getAddress());
    await vault.setFeeReceiver(fee.address);
    // fund vault generously
    await usdc.mint(owner.address, 1_000_000n * M);
    await usdc.approve(await vault.getAddress(), 1_000_000n * M);
    await vault.fundVault(100_000n * M);
    // give alice/bob money
    await usdc.mint(alice.address, 10_000n * M);
    await usdc.mint(bob.address, 10_000n * M);
    await usdc.connect(alice).approve(await core.getAddress(), 10_000n * M);
    await usdc.connect(bob).approve(await core.getAddress(), 10_000n * M);
  }

  // default plan helper: 180d, 225 bps, no limits, 550 bps penalty
  async function createDefaultPlan() {
    await core.connect(owner).createPlan(TENOR_DAYS, APR_BPS, 0, 0, PENALTY_BPS);
    return 0n; // first planId
  }

  describe("plan management", function () {
    beforeEach(deployAll);

    it("creates a plan with personal-variant values and emits event", async () => {
      await expect(core.connect(owner).createPlan(TENOR_DAYS, APR_BPS, 0, 0, PENALTY_BPS))
        .to.emit(core, "PlanCreated").withArgs(0n, TENOR_DAYS, APR_BPS);
      const p = await core.plans(0n);
      expect(p.aprBps).to.equal(APR_BPS);
      expect(p.tenorDays).to.equal(TENOR_DAYS);
      expect(p.earlyWithdrawPenaltyBps).to.equal(PENALTY_BPS);
      expect(p.enabled).to.equal(true);
      expect(await core.planCount()).to.equal(1n);
    });

    it("rejects non-owner createPlan", async () => {
      await expect(core.connect(alice).createPlan(TENOR_DAYS, APR_BPS, 0, 0, PENALTY_BPS)).to.be.reverted;
    });

    it("rejects invalid APR (zero and above max)", async () => {
      await expect(core.connect(owner).createPlan(TENOR_DAYS, 0, 0, 0, PENALTY_BPS)).to.be.revertedWith("bad apr");
      await expect(core.connect(owner).createPlan(TENOR_DAYS, 10001, 0, 0, PENALTY_BPS)).to.be.revertedWith("bad apr");
    });

    it("rejects zero tenor and bad limits", async () => {
      await expect(core.connect(owner).createPlan(0, APR_BPS, 0, 0, PENALTY_BPS)).to.be.revertedWith("bad tenor");
      await expect(core.connect(owner).createPlan(TENOR_DAYS, APR_BPS, 100, 50, PENALTY_BPS)).to.be.revertedWith("bad limits");
    });

    it("updates plan APR (new deposits only) and emits", async () => {
      await createDefaultPlan();
      await expect(core.connect(owner).updatePlan(0n, 300n)).to.emit(core, "PlanUpdated").withArgs(0n, 300n);
      expect((await core.plans(0n)).aprBps).to.equal(300n);
      await expect(core.connect(owner).updatePlan(0n, 0)).to.be.revertedWith("bad apr");
    });

    it("enables and disables plans", async () => {
      await createDefaultPlan();
      await expect(core.connect(owner).disablePlan(0n)).to.emit(core, "PlanDisabled").withArgs(0n);
      expect((await core.plans(0n)).enabled).to.equal(false);
      await expect(core.connect(owner).enablePlan(0n)).to.emit(core, "PlanEnabled").withArgs(0n);
      expect((await core.plans(0n)).enabled).to.equal(true);
    });

    it("sets keeper reward bps (owner only)", async () => {
      await expect(core.connect(alice).setKeeperRewardBps(50)).to.be.reverted;
      await expect(core.connect(owner).setKeeperRewardBps(50)).to.emit(core, "KeeperRewardUpdated").withArgs(50n);
      expect(await core.keeperRewardBps()).to.equal(50n);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx hardhat test test/SavingCore.test.ts`
Expected: FAIL — `SavingCore` artifact not found.

- [ ] **Step 3: Write SavingCore.sol skeleton (plans + state only)**

Create `contracts/SavingCore.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IVaultManager.sol";

/// @title SavingCore
/// @notice Term-deposit logic. Holds user principal, mints ERC721 deposit certificates,
///         and pays interest from a separate VaultManager. APR/penalty are snapshotted per deposit.
contract SavingCore is ERC721, Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant MAX_APR_BPS = 10000;
    uint256 public constant SECONDS_PER_DAY = 86400;
    uint256 public constant SECONDS_PER_YEAR = 365 days;
    uint256 public constant GRACE_PERIOD = 3 days; // personal variant: (1 mod 3)+2 = 3 days

    IERC20 public immutable usdc;
    IVaultManager public immutable vault;

    struct Plan {
        uint256 tenorDays;
        uint256 aprBps;
        uint256 minDeposit;
        uint256 maxDeposit;
        uint256 earlyWithdrawPenaltyBps;
        bool enabled;
    }

    enum DepositStatus { Active, Withdrawn, ManualRenewed, AutoRenewed }

    struct Deposit {
        uint256 planId;
        uint256 principal;
        uint256 startAt;
        uint256 maturityAt;
        uint256 aprBpsAtOpen;
        uint256 penaltyBpsAtOpen;
        uint256 tenorDaysAtOpen;
        DepositStatus status;
        uint256 pendingInterest;
    }

    Plan[] private _plans;
    mapping(uint256 => Deposit) public deposits;
    uint256 public nextDepositId;
    uint256 public keeperRewardBps; // bonus G: paid from vault on top of interest

    event PlanCreated(uint256 planId, uint256 tenorDays, uint256 aprBps);
    event PlanUpdated(uint256 planId, uint256 newAprBps);
    event PlanEnabled(uint256 planId);
    event PlanDisabled(uint256 planId);
    event KeeperRewardUpdated(uint256 bps);
    event DepositOpened(uint256 depositId, address owner, uint256 planId, uint256 principal, uint256 maturityAt, uint256 aprBpsAtOpen);
    event Withdrawn(uint256 depositId, address owner, uint256 principal, uint256 interest, bool isEarly);
    event Renewed(uint256 oldDepositId, uint256 newDepositId, uint256 newPrincipal, uint256 newPlanId);
    event InterestClaimed(uint256 depositId, address owner, uint256 amount);
    event KeeperRewardPaid(uint256 depositId, address keeper, uint256 amount);

    constructor(address _usdc, address _vault)
        ERC721("Saving Deposit Certificate", "SDC")
        Ownable(msg.sender)
    {
        require(_usdc != address(0) && _vault != address(0), "zero addr");
        usdc = IERC20(_usdc);
        vault = IVaultManager(_vault);
    }

    // ----- Plan management -----

    function createPlan(
        uint256 tenorDays,
        uint256 aprBps,
        uint256 minDeposit,
        uint256 maxDeposit,
        uint256 penaltyBps
    ) external onlyOwner returns (uint256 planId) {
        require(tenorDays > 0, "bad tenor");
        require(aprBps > 0 && aprBps <= MAX_APR_BPS, "bad apr");
        require(penaltyBps <= BPS_DENOMINATOR, "bad penalty");
        if (minDeposit > 0 && maxDeposit > 0) {
            require(maxDeposit >= minDeposit, "bad limits");
        }
        planId = _plans.length;
        _plans.push(Plan(tenorDays, aprBps, minDeposit, maxDeposit, penaltyBps, true));
        emit PlanCreated(planId, tenorDays, aprBps);
    }

    function updatePlan(uint256 planId, uint256 newAprBps) external onlyOwner {
        require(planId < _plans.length, "no plan");
        require(newAprBps > 0 && newAprBps <= MAX_APR_BPS, "bad apr");
        _plans[planId].aprBps = newAprBps;
        emit PlanUpdated(planId, newAprBps);
    }

    function enablePlan(uint256 planId) external onlyOwner {
        require(planId < _plans.length, "no plan");
        _plans[planId].enabled = true;
        emit PlanEnabled(planId);
    }

    function disablePlan(uint256 planId) external onlyOwner {
        require(planId < _plans.length, "no plan");
        _plans[planId].enabled = false;
        emit PlanDisabled(planId);
    }

    function setKeeperRewardBps(uint256 bps) external onlyOwner {
        require(bps <= BPS_DENOMINATOR, "bad bps");
        keeperRewardBps = bps;
        emit KeeperRewardUpdated(bps);
    }

    function plans(uint256 planId) external view returns (Plan memory) {
        require(planId < _plans.length, "no plan");
        return _plans[planId];
    }

    function planCount() external view returns (uint256) {
        return _plans.length;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx hardhat test test/SavingCore.test.ts`
Expected: PASS (plan management describe: 7 passing).

- [ ] **Step 5: Commit**

```bash
cd /home/khangia/capstone/hardhat-temp
git add contracts/SavingCore.sol test/SavingCore.test.ts
git commit -m "feat: SavingCore skeleton with plan management and ERC721 base"
```

---

### Task 5: openDeposit + interest preview helper

**Files:**
- Modify: `contracts/SavingCore.sol`
- Test: `test/SavingCore.test.ts` (append `describe("openDeposit")`)

**Interfaces:**
- Produces:
  - `openDeposit(uint256 planId, uint256 amount) → uint256 depositId`
  - `previewInterest(uint256 depositId) → uint256` (view; used by later tasks and frontend)
  - Internal: `_computeInterest(Deposit storage d) → uint256`

- [ ] **Step 1: Write the failing test**

Append inside the outer `describe("SavingCore")`:

```typescript
  describe("openDeposit", function () {
    beforeEach(async () => { await deployAll(); await core.connect(owner).createPlan(TENOR_DAYS, APR_BPS, 100n * M, 5000n * M, PENALTY_BPS); });

    it("opens a deposit, holds principal, mints NFT, snapshots APR", async () => {
      const amount = 1000n * M;
      const tx = await core.connect(alice).openDeposit(0n, amount);
      const rc = await tx.wait();
      const block = await ethers.provider.getBlock(rc!.blockNumber);
      const expectedMaturity = BigInt(block!.timestamp) + TENOR_DAYS * BigInt(DAY);
      await expect(tx).to.emit(core, "DepositOpened").withArgs(0n, alice.address, 0n, amount, expectedMaturity, APR_BPS);
      expect(await core.ownerOf(0n)).to.equal(alice.address);
      expect(await usdc.balanceOf(await core.getAddress())).to.equal(amount);
      const d = await core.deposits(0n);
      expect(d.principal).to.equal(amount);
      expect(d.aprBpsAtOpen).to.equal(APR_BPS);
      expect(d.penaltyBpsAtOpen).to.equal(PENALTY_BPS);
      expect(d.status).to.equal(0); // Active
    });

    it("snapshot is immutable across plan updates", async () => {
      await core.connect(alice).openDeposit(0n, 1000n * M);
      await core.connect(owner).updatePlan(0n, 999n);
      expect((await core.deposits(0n)).aprBpsAtOpen).to.equal(APR_BPS); // unchanged
    });

    it("rejects below min and above max", async () => {
      await expect(core.connect(alice).openDeposit(0n, 50n * M)).to.be.revertedWith("below min");
      await expect(core.connect(alice).openDeposit(0n, 6000n * M)).to.be.revertedWith("above max");
    });

    it("rejects disabled plan", async () => {
      await core.connect(owner).disablePlan(0n);
      await expect(core.connect(alice).openDeposit(0n, 1000n * M)).to.be.revertedWith("plan disabled");
    });

    it("rejects when paused", async () => {
      await core.connect(owner).pause();
      await expect(core.connect(alice).openDeposit(0n, 1000n * M)).to.be.reverted;
    });

    it("previewInterest matches the spec formula", async () => {
      await core.connect(alice).openDeposit(0n, 1000n * M);
      // interest = mulDiv(1e9, 225 * (180*86400), 31536000 * 10000)
      const tenorSeconds = 180n * BigInt(DAY);
      const expected = (1000n * M * (APR_BPS * tenorSeconds)) / (31_536_000n * 10_000n);
      expect(await core.previewInterest(0n)).to.equal(expected);
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx hardhat test test/SavingCore.test.ts`
Expected: FAIL — `openDeposit` is not a function.

- [ ] **Step 3: Add openDeposit + interest helpers to SavingCore.sol**

Add before `function pause()`:

```solidity
    // ----- Deposit lifecycle -----

    function openDeposit(uint256 planId, uint256 amount)
        external
        whenNotPaused
        nonReentrant
        returns (uint256 depositId)
    {
        require(planId < _plans.length, "no plan");
        Plan memory p = _plans[planId];
        require(p.enabled, "plan disabled");
        if (p.minDeposit > 0) require(amount >= p.minDeposit, "below min");
        if (p.maxDeposit > 0) require(amount <= p.maxDeposit, "above max");

        usdc.safeTransferFrom(msg.sender, address(this), amount);

        depositId = nextDepositId++;
        uint256 maturityAt = block.timestamp + p.tenorDays * SECONDS_PER_DAY;
        deposits[depositId] = Deposit({
            planId: planId,
            principal: amount,
            startAt: block.timestamp,
            maturityAt: maturityAt,
            aprBpsAtOpen: p.aprBps,
            penaltyBpsAtOpen: p.earlyWithdrawPenaltyBps,
            tenorDaysAtOpen: p.tenorDays,
            status: DepositStatus.Active,
            pendingInterest: 0
        });

        _safeMint(msg.sender, depositId);
        emit DepositOpened(depositId, msg.sender, planId, amount, maturityAt, p.aprBps);
    }

    function _computeInterest(Deposit memory d) internal pure returns (uint256) {
        uint256 tenorSeconds = d.tenorDaysAtOpen * SECONDS_PER_DAY;
        return Math.mulDiv(d.principal, d.aprBpsAtOpen * tenorSeconds, SECONDS_PER_YEAR * BPS_DENOMINATOR);
    }

    function previewInterest(uint256 depositId) external view returns (uint256) {
        return _computeInterest(deposits[depositId]);
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx hardhat test test/SavingCore.test.ts`
Expected: PASS (openDeposit describe: 6 passing).

- [ ] **Step 5: Commit**

```bash
cd /home/khangia/capstone/hardhat-temp
git add contracts/SavingCore.sol test/SavingCore.test.ts
git commit -m "feat: openDeposit with principal custody, NFT mint, APR snapshot"
```

---

### Task 6: withdrawAtMaturity + C1 (pendingInterest + claimInterest)

**Files:**
- Modify: `contracts/SavingCore.sol`
- Test: `test/SavingCore.test.ts` (append `describe("withdrawAtMaturity")`)

**Interfaces:**
- Produces:
  - `withdrawAtMaturity(uint256 depositId)`
  - `claimInterest(uint256 depositId)`
  - Internal helper: `_requireOwner(uint256 depositId)` reverts "not owner" if `ownerOf != msg.sender`.

- [ ] **Step 1: Write the failing test**

Append inside the outer `describe("SavingCore")`:

```typescript
  describe("withdrawAtMaturity", function () {
    beforeEach(async () => { await deployAll(); await core.connect(owner).createPlan(TENOR_DAYS, APR_BPS, 0, 0, PENALTY_BPS); await core.connect(alice).openDeposit(0n, 1000n * M); });

    it("pays principal + interest at maturity", async () => {
      const interest = await core.previewInterest(0n);
      await time.increase(Number(TENOR_DAYS) * DAY);
      const before = await usdc.balanceOf(alice.address);
      await expect(core.connect(alice).withdrawAtMaturity(0n))
        .to.emit(core, "Withdrawn").withArgs(0n, alice.address, 1000n * M, interest, false);
      expect(await usdc.balanceOf(alice.address)).to.equal(before + 1000n * M + interest);
      expect((await core.deposits(0n)).status).to.equal(1); // Withdrawn
    });

    it("succeeds exactly at maturity second", async () => {
      const d = await core.deposits(0n);
      await time.increaseTo(d.maturityAt);
      await expect(core.connect(alice).withdrawAtMaturity(0n)).to.not.be.reverted;
    });

    it("reverts if too early", async () => {
      await expect(core.connect(alice).withdrawAtMaturity(0n)).to.be.revertedWith("not matured");
    });

    it("reverts on double withdraw", async () => {
      await time.increase(Number(TENOR_DAYS) * DAY);
      await core.connect(alice).withdrawAtMaturity(0n);
      await expect(core.connect(alice).withdrawAtMaturity(0n)).to.be.revertedWith("not active");
    });

    it("reverts if not owner", async () => {
      await time.increase(Number(TENOR_DAYS) * DAY);
      await expect(core.connect(bob).withdrawAtMaturity(0n)).to.be.revertedWith("not owner");
    });

    it("the NFT owner (buyer) can withdraw after transfer", async () => {
      await time.increase(Number(TENOR_DAYS) * DAY);
      await core.connect(alice).transferFrom(alice.address, bob.address, 0n);
      await core.connect(bob).withdrawAtMaturity(0n);
      expect((await core.deposits(0n)).status).to.equal(1);
    });

    describe("C1: principal always safe when vault is short", function () {
      it("pays principal fully, records pendingInterest, and lets owner claim later", async () => {
        // drain the vault below the interest owed
        const interest = await core.previewInterest(0n);
        // schedule+execute a withdraw that empties the vault
        await vault.connect(owner).scheduleWithdrawVault(await vault.vaultBalance());
        await time.increase(2 * DAY);
        await vault.connect(owner).executeWithdrawVault();
        expect(await vault.vaultBalance()).to.equal(0n);

        await time.increase(Number(TENOR_DAYS) * DAY);
        const before = await usdc.balanceOf(alice.address);
        await core.connect(alice).withdrawAtMaturity(0n);
        // principal returned in full, interest = 0 paid
        expect(await usdc.balanceOf(alice.address)).to.equal(before + 1000n * M);
        expect((await core.deposits(0n)).pendingInterest).to.equal(interest);

        // refund vault, claim
        await vault.connect(owner).fundVault(interest);
        await expect(core.connect(alice).claimInterest(0n))
          .to.emit(core, "InterestClaimed").withArgs(0n, alice.address, interest);
        expect((await core.deposits(0n)).pendingInterest).to.equal(0n);
      });

      it("claimInterest reverts when nothing pending", async () => {
        await time.increase(Number(TENOR_DAYS) * DAY);
        await core.connect(alice).withdrawAtMaturity(0n);
        await expect(core.connect(alice).claimInterest(0n)).to.be.revertedWith("nothing pending");
      });
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx hardhat test test/SavingCore.test.ts`
Expected: FAIL — `withdrawAtMaturity` is not a function.

- [ ] **Step 3: Add withdrawAtMaturity + claimInterest to SavingCore.sol**

Add before `function _computeInterest`:

```solidity
    function _requireOwner(uint256 depositId) internal view {
        require(ownerOf(depositId) == msg.sender, "not owner");
    }

    function withdrawAtMaturity(uint256 depositId)
        external
        whenNotPaused
        nonReentrant
    {
        _requireOwner(depositId);
        Deposit storage d = deposits[depositId];
        require(d.status == DepositStatus.Active, "not active");
        require(block.timestamp >= d.maturityAt, "not matured");

        uint256 interest = _computeInterest(d);
        uint256 principal = d.principal;

        // Effects before interactions (CEI): prevents reentrancy + double withdraw.
        d.status = DepositStatus.Withdrawn;

        usdc.safeTransfer(msg.sender, principal);
        uint256 paid = vault.payInterest(msg.sender, interest);
        if (paid < interest) {
            d.pendingInterest = interest - paid; // C1: owe the rest, claimable later
        }

        emit Withdrawn(depositId, msg.sender, principal, paid, false);
    }

    /// @notice Claim interest that the vault could not pay at withdraw/renew time (C1).
    function claimInterest(uint256 depositId)
        external
        whenNotPaused
        nonReentrant
    {
        _requireOwner(depositId);
        Deposit storage d = deposits[depositId];
        uint256 owed = d.pendingInterest;
        require(owed > 0, "nothing pending");
        uint256 paid = vault.payInterest(msg.sender, owed);
        d.pendingInterest = owed - paid;
        emit InterestClaimed(depositId, msg.sender, paid);
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx hardhat test test/SavingCore.test.ts`
Expected: PASS (withdrawAtMaturity describe: 8 passing).

- [ ] **Step 5: Commit**

```bash
cd /home/khangia/capstone/hardhat-temp
git add contracts/SavingCore.sol test/SavingCore.test.ts
git commit -m "feat: withdrawAtMaturity with C1 pendingInterest and claimInterest"
```

---

### Task 7: earlyWithdraw

**Files:**
- Modify: `contracts/SavingCore.sol`
- Test: `test/SavingCore.test.ts` (append `describe("earlyWithdraw")`)

**Interfaces:**
- Produces: `earlyWithdraw(uint256 depositId)`

- [ ] **Step 1: Write the failing test**

Append inside the outer `describe("SavingCore")`:

```typescript
  describe("earlyWithdraw", function () {
    beforeEach(async () => { await deployAll(); await core.connect(owner).createPlan(TENOR_DAYS, APR_BPS, 0, 0, PENALTY_BPS); await core.connect(alice).openDeposit(0n, 1000n * M); });

    it("applies penalty, pays no interest, credits feeReceiver", async () => {
      const penalty = (1000n * M * PENALTY_BPS) / 10_000n; // 550 bps of 1000 = 55 USDC
      const before = await usdc.balanceOf(alice.address);
      const feeBefore = await usdc.balanceOf(fee.address);
      await expect(core.connect(alice).earlyWithdraw(0n))
        .to.emit(core, "Withdrawn").withArgs(0n, alice.address, 1000n * M, 0n, true);
      expect(await usdc.balanceOf(alice.address)).to.equal(before + 1000n * M - penalty);
      expect(await usdc.balanceOf(fee.address)).to.equal(feeBefore + penalty);
      expect((await core.deposits(0n)).status).to.equal(1); // Withdrawn
    });

    it("reverts if already matured", async () => {
      await time.increase(Number(TENOR_DAYS) * DAY);
      await expect(core.connect(alice).earlyWithdraw(0n)).to.be.revertedWith("already matured");
    });

    it("reverts if not owner and if not active", async () => {
      await expect(core.connect(bob).earlyWithdraw(0n)).to.be.revertedWith("not owner");
      await core.connect(alice).earlyWithdraw(0n);
      await expect(core.connect(alice).earlyWithdraw(0n)).to.be.revertedWith("not active");
    });

    it("reverts when paused", async () => {
      await core.connect(owner).pause();
      await expect(core.connect(alice).earlyWithdraw(0n)).to.be.reverted;
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx hardhat test test/SavingCore.test.ts`
Expected: FAIL — `earlyWithdraw` is not a function.

- [ ] **Step 3: Add earlyWithdraw to SavingCore.sol**

Add after `withdrawAtMaturity`:

```solidity
    function earlyWithdraw(uint256 depositId)
        external
        whenNotPaused
        nonReentrant
    {
        _requireOwner(depositId);
        Deposit storage d = deposits[depositId];
        require(d.status == DepositStatus.Active, "not active");
        require(block.timestamp < d.maturityAt, "already matured");

        uint256 principal = d.principal;
        uint256 penalty = Math.mulDiv(principal, d.penaltyBpsAtOpen, BPS_DENOMINATOR);

        // Effects
        d.status = DepositStatus.Withdrawn;

        // Interactions: principal minus penalty to user, penalty to feeReceiver. No interest.
        usdc.safeTransfer(msg.sender, principal - penalty);
        if (penalty > 0) {
            usdc.safeTransfer(vault.feeReceiver(), penalty);
        }

        emit Withdrawn(depositId, msg.sender, principal, 0, true);
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx hardhat test test/SavingCore.test.ts`
Expected: PASS (earlyWithdraw describe: 4 passing).

- [ ] **Step 5: Commit**

```bash
cd /home/khangia/capstone/hardhat-temp
git add contracts/SavingCore.sol test/SavingCore.test.ts
git commit -m "feat: earlyWithdraw with penalty to feeReceiver, no interest"
```

---

### Task 8: renewDeposit (manual)

**Files:**
- Modify: `contracts/SavingCore.sol`
- Test: `test/SavingCore.test.ts` (append `describe("renewDeposit")`)

**Interfaces:**
- Produces: `renewDeposit(uint256 depositId, uint256 newPlanId) → uint256 newDepositId`
- Internal: `_mintRenewal(address to, uint256 planId, uint256 newPrincipal, uint256 aprBps, uint256 penaltyBps, uint256 tenorDays) → uint256` (shared by Task 9)

- [ ] **Step 1: Write the failing test**

Append inside the outer `describe("SavingCore")`:

```typescript
  describe("renewDeposit (manual)", function () {
    beforeEach(async () => {
      await deployAll();
      await core.connect(owner).createPlan(TENOR_DAYS, APR_BPS, 0, 0, PENALTY_BPS); // plan 0
      await core.connect(owner).createPlan(90n, 300n, 0, 0, 400n);                  // plan 1 (different)
      await core.connect(alice).openDeposit(0n, 1000n * M);
    });

    it("compounds interest into new principal with the new plan's rate", async () => {
      const interest = await core.previewInterest(0n);
      await time.increase(Number(TENOR_DAYS) * DAY);
      const tx = await core.connect(alice).renewDeposit(0n, 1n);
      const newPrincipal = 1000n * M + interest;
      await expect(tx).to.emit(core, "Renewed").withArgs(0n, 1n, newPrincipal, 1n);
      // old status ManualRenewed
      expect((await core.deposits(0n)).status).to.equal(2);
      // new deposit uses plan 1 snapshot
      const nd = await core.deposits(1n);
      expect(nd.principal).to.equal(newPrincipal);
      expect(nd.aprBpsAtOpen).to.equal(300n);
      expect(nd.tenorDaysAtOpen).to.equal(90n);
      expect(await core.ownerOf(1n)).to.equal(alice.address);
    });

    it("reverts before maturity", async () => {
      await expect(core.connect(alice).renewDeposit(0n, 1n)).to.be.revertedWith("not matured");
    });

    it("reverts renewing INTO a disabled plan", async () => {
      await time.increase(Number(TENOR_DAYS) * DAY);
      await core.connect(owner).disablePlan(1n);
      await expect(core.connect(alice).renewDeposit(0n, 1n)).to.be.revertedWith("plan disabled");
    });

    it("reverts if not owner / not active", async () => {
      await time.increase(Number(TENOR_DAYS) * DAY);
      await expect(core.connect(bob).renewDeposit(0n, 1n)).to.be.revertedWith("not owner");
      await core.connect(alice).renewDeposit(0n, 1n);
      await expect(core.connect(alice).renewDeposit(0n, 1n)).to.be.revertedWith("not active");
    });

    it("reverts when paused", async () => {
      await time.increase(Number(TENOR_DAYS) * DAY);
      await core.connect(owner).pause();
      await expect(core.connect(alice).renewDeposit(0n, 1n)).to.be.reverted;
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx hardhat test test/SavingCore.test.ts`
Expected: FAIL — `renewDeposit` is not a function.

- [ ] **Step 3: Add renewDeposit + _mintRenewal to SavingCore.sol**

Add after `earlyWithdraw`:

```solidity
    function renewDeposit(uint256 depositId, uint256 newPlanId)
        external
        whenNotPaused
        nonReentrant
        returns (uint256 newDepositId)
    {
        _requireOwner(depositId);
        Deposit storage d = deposits[depositId];
        require(d.status == DepositStatus.Active, "not active");
        require(block.timestamp >= d.maturityAt, "not matured");
        require(newPlanId < _plans.length, "no plan");
        Plan memory np = _plans[newPlanId];
        require(np.enabled, "plan disabled");

        uint256 interest = _computeInterest(d);
        address who = msg.sender;

        // Effects
        d.status = DepositStatus.ManualRenewed;

        // Pull interest from vault into this contract to compound. C1: only the paid part compounds.
        uint256 paid = vault.payInterest(address(this), interest);
        if (paid < interest) {
            d.pendingInterest = interest - paid; // owner can claim the rest against the OLD NFT
        }
        uint256 newPrincipal = d.principal + paid;

        newDepositId = _mintRenewal(who, newPlanId, newPrincipal, np.aprBps, np.earlyWithdrawPenaltyBps, np.tenorDays);
        emit Renewed(depositId, newDepositId, newPrincipal, newPlanId);
    }

    function _mintRenewal(
        address to,
        uint256 planId,
        uint256 newPrincipal,
        uint256 aprBps,
        uint256 penaltyBps,
        uint256 tenorDays
    ) internal returns (uint256 newDepositId) {
        newDepositId = nextDepositId++;
        uint256 maturityAt = block.timestamp + tenorDays * SECONDS_PER_DAY;
        deposits[newDepositId] = Deposit({
            planId: planId,
            principal: newPrincipal,
            startAt: block.timestamp,
            maturityAt: maturityAt,
            aprBpsAtOpen: aprBps,
            penaltyBpsAtOpen: penaltyBps,
            tenorDaysAtOpen: tenorDays,
            status: DepositStatus.Active,
            pendingInterest: 0
        });
        _safeMint(to, newDepositId);
        emit DepositOpened(newDepositId, to, planId, newPrincipal, maturityAt, aprBps);
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx hardhat test test/SavingCore.test.ts`
Expected: PASS (renewDeposit describe: 5 passing).

- [ ] **Step 5: Commit**

```bash
cd /home/khangia/capstone/hardhat-temp
git add contracts/SavingCore.sol test/SavingCore.test.ts
git commit -m "feat: manual renewDeposit compounding interest into new plan"
```

---

### Task 9: autoRenewDeposit (bonus G keeper) + grace period

**Files:**
- Modify: `contracts/SavingCore.sol`
- Test: `test/SavingCore.test.ts` (append `describe("autoRenewDeposit")`)

**Interfaces:**
- Produces: `autoRenewDeposit(uint256 depositId) → uint256 newDepositId`

- [ ] **Step 1: Write the failing test**

Append inside the outer `describe("SavingCore")`:

```typescript
  describe("autoRenewDeposit (keeper, bonus G)", function () {
    beforeEach(async () => {
      await deployAll();
      await core.connect(owner).createPlan(TENOR_DAYS, APR_BPS, 0, 0, PENALTY_BPS); // plan 0
      await core.connect(owner).setKeeperRewardBps(50); // 0.5% of interest to keeper
      await core.connect(alice).openDeposit(0n, 1000n * M);
    });

    it("reverts before grace period ends", async () => {
      await time.increase(Number(TENOR_DAYS) * DAY); // exactly maturity, grace not passed
      await expect(core.connect(keeper).autoRenewDeposit(0n)).to.be.revertedWith("grace not passed");
    });

    it("anyone can call after grace; APR is locked to original; keeper is paid from vault", async () => {
      const interest = await core.previewInterest(0n);
      await time.increase((Number(TENOR_DAYS) + GRACE_DAYS) * DAY);
      const keeperBefore = await usdc.balanceOf(keeper.address);
      const reward = (interest * 50n) / 10_000n;

      const tx = await core.connect(keeper).autoRenewDeposit(0n);
      const newPrincipal = 1000n * M + interest;
      await expect(tx).to.emit(core, "Renewed").withArgs(0n, 1n, newPrincipal, 0n);
      await expect(tx).to.emit(core, "KeeperRewardPaid").withArgs(0n, keeper.address, reward);

      // keeper got the reward
      expect(await usdc.balanceOf(keeper.address)).to.equal(keeperBefore + reward);
      // old status AutoRenewed
      expect((await core.deposits(0n)).status).to.equal(3);
      // new deposit: SAME tenor + SAME (original) APR, minted to alice (original owner)
      const nd = await core.deposits(1n);
      expect(nd.aprBpsAtOpen).to.equal(APR_BPS);
      expect(nd.tenorDaysAtOpen).to.equal(TENOR_DAYS);
      expect(nd.principal).to.equal(newPrincipal);
      expect(await core.ownerOf(1n)).to.equal(alice.address);
    });

    it("uses original APR even if admin lowered the plan rate", async () => {
      await core.connect(owner).updatePlan(0n, 100n); // drop plan APR
      const interest = await core.previewInterest(0n); // still original 225 bps
      await time.increase((Number(TENOR_DAYS) + GRACE_DAYS) * DAY);
      await core.connect(keeper).autoRenewDeposit(0n);
      expect((await core.deposits(1n)).aprBpsAtOpen).to.equal(APR_BPS);
      expect((await core.deposits(1n)).principal).to.equal(1000n * M + interest);
    });

    it("works even if the original plan was disabled (continues old terms)", async () => {
      await time.increase((Number(TENOR_DAYS) + GRACE_DAYS) * DAY);
      await core.connect(owner).disablePlan(0n);
      await expect(core.connect(keeper).autoRenewDeposit(0n)).to.not.be.reverted;
    });

    it("reverts on non-active deposit", async () => {
      await time.increase((Number(TENOR_DAYS) + GRACE_DAYS) * DAY);
      await core.connect(keeper).autoRenewDeposit(0n);
      await expect(core.connect(keeper).autoRenewDeposit(0n)).to.be.revertedWith("not active");
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx hardhat test test/SavingCore.test.ts`
Expected: FAIL — `autoRenewDeposit` is not a function.

- [ ] **Step 3: Add autoRenewDeposit to SavingCore.sol**

Add after `renewDeposit`:

```solidity
    /// @notice Permissionless auto-renew after the grace period (bonus G).
    ///         Anyone may call; caller earns keeperRewardBps of the interest, paid from the vault
    ///         on top of the user's interest (never from principal). Uses the ORIGINAL snapshot
    ///         (same tenor, original APR/penalty) so the user is protected from rate cuts.
    function autoRenewDeposit(uint256 depositId)
        external
        whenNotPaused
        nonReentrant
        returns (uint256 newDepositId)
    {
        Deposit storage d = deposits[depositId];
        require(d.status == DepositStatus.Active, "not active");
        require(block.timestamp >= d.maturityAt + GRACE_PERIOD, "grace not passed");

        address owner_ = ownerOf(depositId);
        uint256 interest = _computeInterest(d);

        // Effects
        d.status = DepositStatus.AutoRenewed;

        // Interest to compound is paid into this contract first. User has priority over keeper.
        uint256 paidInterest = vault.payInterest(address(this), interest);
        if (paidInterest < interest) {
            d.pendingInterest = interest - paidInterest;
        }
        uint256 newPrincipal = d.principal + paidInterest;

        // Keeper reward, only from what the vault can still afford, sent to caller directly.
        uint256 reward = Math.mulDiv(interest, keeperRewardBps, BPS_DENOMINATOR);
        uint256 paidReward = reward > 0 ? vault.payInterest(msg.sender, reward) : 0;
        if (paidReward > 0) {
            emit KeeperRewardPaid(depositId, msg.sender, paidReward);
        }

        newDepositId = _mintRenewal(
            owner_,
            d.planId,
            newPrincipal,
            d.aprBpsAtOpen,
            d.penaltyBpsAtOpen,
            d.tenorDaysAtOpen
        );
        emit Renewed(depositId, newDepositId, newPrincipal, d.planId);
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx hardhat test test/SavingCore.test.ts`
Expected: PASS (autoRenewDeposit describe: 5 passing).

Note: the `KeeperRewardPaid` test asserts `reward` exactly. Because the vault is well-funded in this suite, `paidReward == reward`. The event is emitted with `paidReward`.

- [ ] **Step 5: Commit**

```bash
cd /home/khangia/capstone/hardhat-temp
git add contracts/SavingCore.sol test/SavingCore.test.ts
git commit -m "feat: permissionless autoRenewDeposit with keeper reward (bonus G)"
```

---

### Task 10: Security (reentrancy) + rounding dust tests

**Files:**
- Create: `contracts/test/MaliciousReceiver.sol`
- Test: `test/SavingCore.test.ts` (append `describe("security")` and `describe("rounding dust")`)

**Interfaces:**
- Consumes: `SavingCore`, `MockUSDC`.
- Produces: `MaliciousReceiver` — an ERC721 receiver that re-enters `openDeposit` inside `onERC721Received` (the callback triggered by `_safeMint`). Because `openDeposit` is `nonReentrant`, the reentrant call reverts and bubbles up, proving the guard holds on the mint path.

Why the mint path: `withdrawAtMaturity`/`earlyWithdraw` move ERC20 via `safeTransfer`, which does NOT call any hook on the recipient, so there is no reentrancy hook there. The only hook into a recipient contract is `_safeMint` → `onERC721Received`, exercised on `openDeposit`, `renewDeposit`, and `autoRenewDeposit`. The reentrancy guard plus CEI status ordering protect all of them; this test demonstrates it on `openDeposit`.

- [ ] **Step 1: Write MaliciousReceiver.sol**

Create `contracts/test/MaliciousReceiver.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ISavingCoreLike {
    function openDeposit(uint256 planId, uint256 amount) external returns (uint256);
}

/// @notice On receiving a certificate NFT (during _safeMint), tries to re-enter openDeposit.
///         The nonReentrant guard must make the reentrant call revert.
contract MaliciousReceiver is IERC721Receiver {
    ISavingCoreLike public immutable core;
    IERC20 public immutable token;
    bool public attack;
    uint256 public planId;
    uint256 public amount;

    constructor(address _core, address _token) {
        core = ISavingCoreLike(_core);
        token = IERC20(_token);
    }

    /// @notice Approve the core to pull this contract's tokens.
    function approveCore(uint256 value) external {
        token.approve(address(core), value);
    }

    function setAttack(bool a, uint256 _planId, uint256 _amount) external {
        attack = a;
        planId = _planId;
        amount = _amount;
    }

    function open(uint256 _planId, uint256 _amount) external returns (uint256 id) {
        id = core.openDeposit(_planId, _amount);
    }

    function onERC721Received(address, address, uint256, bytes calldata)
        external
        override
        returns (bytes4)
    {
        if (attack) {
            attack = false; // only try once to avoid infinite recursion in the revert path
            core.openDeposit(planId, amount); // reentrant call — must revert under nonReentrant
        }
        return IERC721Receiver.onERC721Received.selector;
    }
}
```

- [ ] **Step 2: Write the failing test**

Append inside the outer `describe("SavingCore")`:

```typescript
  describe("security", function () {
    beforeEach(async () => { await deployAll(); await core.connect(owner).createPlan(TENOR_DAYS, APR_BPS, 0, 0, PENALTY_BPS); });

    it("blocks reentrancy on the _safeMint path (openDeposit)", async () => {
      const mal = await (await ethers.getContractFactory("MaliciousReceiver"))
        .deploy(await core.getAddress(), await usdc.getAddress());
      await usdc.mint(await mal.getAddress(), 5000n * M);
      await mal.approveCore(5000n * M);
      // arm the attack: when the mint callback fires, it re-enters openDeposit
      await mal.setAttack(true, 0n, 1000n * M);
      await expect(mal.open(0n, 1000n * M))
        .to.be.revertedWithCustomError(core, "ReentrancyGuardReentrantCall");
    });

    it("status-before-transfer prevents double withdraw (CEI, independent of guard)", async () => {
      await core.connect(alice).openDeposit(0n, 1000n * M);
      await time.increase(Number(TENOR_DAYS) * DAY);
      await core.connect(alice).withdrawAtMaturity(0n);
      await expect(core.connect(alice).withdrawAtMaturity(0n)).to.be.revertedWith("not active");
    });
  });

  describe("rounding dust (Open Question #4)", function () {
    beforeEach(async () => { await deployAll(); await core.connect(owner).createPlan(1n, 1n, 0, 0, PENALTY_BPS); }); // 1 day, 1 bps

    it("interest truncates down; vault keeps the dust; no revert", async () => {
      // tiny principal so interest rounds toward zero
      await usdc.mint(alice.address, 10n);
      await usdc.connect(alice).approve(await core.getAddress(), 10n);
      await core.connect(alice).openDeposit(0n, 10n); // 10 base units
      const preview = await core.previewInterest(0n);
      const tenorSeconds = 1n * BigInt(DAY);
      const expected = (10n * (1n * tenorSeconds)) / (31_536_000n * 10_000n); // = 0 (truncated)
      expect(preview).to.equal(expected); // 0
      const vaultBefore = await vault.vaultBalance();
      await time.increase(1 * DAY);
      const aliceBefore = await usdc.balanceOf(alice.address);
      await core.connect(alice).withdrawAtMaturity(0n); // must not revert
      // principal returned, zero interest, vault unchanged (kept the sub-unit dust)
      expect(await usdc.balanceOf(alice.address)).to.equal(aliceBefore + 10n);
      expect(await vault.vaultBalance()).to.equal(vaultBefore);
    });
  });
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `npx hardhat test test/SavingCore.test.ts`
Expected: PASS (security: 2 passing; rounding dust: 1 passing).

- [ ] **Step 4: Commit**

```bash
cd /home/khangia/capstone/hardhat-temp
git add contracts/test/MaliciousReceiver.sol test/SavingCore.test.ts
git commit -m "test: reentrancy guard on mint path and rounding-dust invariants"
```

---

### Task 11: Deploy script + coverage gate

**Files:**
- Modify: `deploy/1-deploy.ts` (replace Counter deploy)
- Test: run coverage

**Interfaces:**
- Produces: local deploy that wires all three contracts and creates the default personal-variant plan.

- [ ] **Step 1: Inspect the existing deploy file**

Run: `cat deploy/1-deploy.ts`
Purpose: match the hardhat-deploy pattern already in the repo.

- [ ] **Step 2: Write the deploy script**

Replace `deploy/1-deploy.ts` with:

```typescript
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

// Personal variant (K234141651): A=1, B=5
const APR_BPS = 225;
const PENALTY_BPS = 550;
const TENOR_DAYS = 180;

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, ethers } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const usdc = await deploy("MockUSDC", { from: deployer, args: [], log: true });
  const vault = await deploy("VaultManager", { from: deployer, args: [usdc.address], log: true });
  const core = await deploy("SavingCore", { from: deployer, args: [usdc.address, vault.address], log: true });

  const vaultC = await ethers.getContractAt("VaultManager", vault.address);
  if ((await vaultC.savingCore()) === ethers.ZeroAddress) {
    await (await vaultC.setSavingCore(core.address)).wait();
  }

  const coreC = await ethers.getContractAt("SavingCore", core.address);
  if ((await coreC.planCount()) === 0n) {
    await (await coreC.createPlan(TENOR_DAYS, APR_BPS, 0, 0, PENALTY_BPS)).wait();
  }

  console.log("MockUSDC:", usdc.address);
  console.log("VaultManager:", vault.address);
  console.log("SavingCore:", core.address);
};

export default func;
func.tags = ["SavingSystem"];
```

- [ ] **Step 3: Verify deploy runs on the in-process network**

Run: `npx hardhat deploy --network hardhat`
Expected: logs three addresses, no revert.

- [ ] **Step 4: Run the full test suite**

Run: `npx hardhat test`
Expected: all tests pass (MockUSDC + VaultManager + SavingCore).

- [ ] **Step 5: Run coverage and confirm > 90%**

Run: `npx hardhat coverage`
Expected: statements/branches/functions/lines all > 90% for the three contracts. If any contract is under 90%, add targeted tests for the uncovered branch (e.g. `setFeeReceiver` zero-address revert, `fundVault` zero-amount revert, `updatePlan` no-plan revert) and re-run.

- [ ] **Step 6: Commit**

```bash
cd /home/khangia/capstone/hardhat-temp
git add deploy/1-deploy.ts
git commit -m "feat: local deploy wiring + default personal-variant plan"
```

---

## Self-Review Notes (coverage of spec)

- Spec §2 architecture/wiring → Task 2 (`setSavingCore` one-time), Task 11 (deploy order).
- Spec §3 data model → Task 4 (Plan/Deposit structs), Task 5 (snapshot fields).
- Spec §4 math → Task 5 (`_computeInterest`, `previewInterest`), verified against example.
- Spec §5 flows → openDeposit (T5), withdrawAtMaturity (T6), earlyWithdraw (T7), renew (T8), autoRenew (T9), claimInterest (T6).
- Spec §6 boundaries (`<`, `>=`) → asserted in T6 (at-maturity second), T7 (already matured), T9 (grace not passed).
- Spec §7 admin → createPlan/updatePlan/enable/disable (T4), fund/withdraw-timelock/setFeeReceiver/pause (T2, T3), setKeeperRewardBps (T4).
- Spec §8 bonuses → C1 (T6), G (T9), F (T3).
- Spec §9 pause → SavingCore pause guards open/withdraw/early/renew/auto/claim (T5-T9); vault pauses payInterest (T2).
- Spec §10 security → T10 reentrancy + CEI double-withdraw.
- Spec §11 events → all emitted across tasks.
- Spec §13 test plan → tasks map 1:1 to required cases; coverage gate in T11.

Open follow-ups for the executor:
- If `viaIR` compilation is slow, that is expected; do not disable it (config-wide setting).
- The reentrancy test (T10) targets the `_safeMint` → `onERC721Received` path via `openDeposit`, since ERC20 `safeTransfer` (withdraw/early) calls no recipient hook. The expected revert is the OZ v5 custom error `ReentrancyGuardReentrantCall`; if a Solidity/OZ minor version surfaces it differently, match on the guard revert rather than a hardcoded string.
- If coverage reports any uncovered `require` branch, add a one-line negative test for it (e.g. `VaultManager.fundVault(0)` → "amount zero", `setFeeReceiver(0)` → "receiver zero", `SavingCore.updatePlan(badId,...)` → "no plan") and re-run until every contract clears 90%.
