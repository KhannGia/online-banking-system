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
