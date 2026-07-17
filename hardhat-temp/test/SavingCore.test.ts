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

    describe("C1: principal always safe when vault is short", function () {
      it("does not compound unpaid interest, records pendingInterest on the old deposit, and lets owner claim later", async () => {
        // interest is deterministic and vault-independent — capture before draining
        const interest = await core.previewInterest(0n);

        // drain the vault via the real timelock
        await vault.connect(owner).scheduleWithdrawVault(await vault.vaultBalance());
        await time.increase(2 * DAY);
        await vault.connect(owner).executeWithdrawVault();
        expect(await vault.vaultBalance()).to.equal(0n);

        await time.increase(Number(TENOR_DAYS) * DAY);
        const tx = await core.connect(alice).renewDeposit(0n, 1n);

        // new principal did NOT compound unpaid interest (vault paid nothing)
        const newPrincipal = 1000n * M;
        await expect(tx).to.emit(core, "Renewed").withArgs(0n, 1n, newPrincipal, 1n);
        expect((await core.deposits(1n)).principal).to.equal(newPrincipal);

        // shortfall recorded on the OLD deposit, which is left ManualRenewed
        expect((await core.deposits(0n)).pendingInterest).to.equal(interest);
        expect((await core.deposits(0n)).status).to.equal(2); // ManualRenewed

        // old NFT still works as a claim ticket once the vault is refunded
        await vault.connect(owner).fundVault(interest);
        const before = await usdc.balanceOf(alice.address);
        await expect(core.connect(alice).claimInterest(0n))
          .to.emit(core, "InterestClaimed").withArgs(0n, alice.address, interest);
        expect(await usdc.balanceOf(alice.address)).to.equal(before + interest);
        expect((await core.deposits(0n)).pendingInterest).to.equal(0n);
      });
    });
  });
});
