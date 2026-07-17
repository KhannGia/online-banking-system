import "@nomicfoundation/hardhat-ethers";
import { ethers } from "hardhat";
import { expect } from "chai";
import { time } from "@nomicfoundation/hardhat-network-helpers";
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

  it("rejects a zero usdc address in the constructor", async () => {
    const Vault = await ethers.getContractFactory("VaultManager");
    await expect(Vault.deploy(ethers.ZeroAddress)).to.be.revertedWith("usdc zero");
  });

  it("sets savingCore once and only by owner", async () => {
    await expect(vault.connect(user).setSavingCore(core.address)).to.be.reverted; // onlyOwner
    await vault.connect(owner).setSavingCore(core.address);
    expect(await vault.savingCore()).to.equal(core.address);
    await expect(vault.connect(owner).setSavingCore(other.address)).to.be.revertedWith("core already set");
  });

  it("rejects a zero core address and emits SavingCoreSet on success", async () => {
    await expect(vault.connect(owner).setSavingCore(ethers.ZeroAddress)).to.be.revertedWith("core zero");
    await expect(vault.connect(owner).setSavingCore(core.address))
      .to.emit(vault, "SavingCoreSet").withArgs(core.address);
  });

  it("funds the vault", async () => {
    await expect(vault.connect(owner).fundVault(100n * M)).to.emit(vault, "Funded").withArgs(100n * M);
    expect(await vault.vaultBalance()).to.equal(100n * M);
  });

  it("rejects non-owner and zero-amount fundVault", async () => {
    await expect(vault.connect(user).fundVault(1n * M)).to.be.reverted; // onlyOwner
    await expect(vault.connect(owner).fundVault(0)).to.be.revertedWith("amount zero");
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

  it("rejects non-owner and zero-address setFeeReceiver", async () => {
    await expect(vault.connect(user).setFeeReceiver(fee.address)).to.be.reverted; // onlyOwner
    await expect(vault.connect(owner).setFeeReceiver(ethers.ZeroAddress)).to.be.revertedWith("receiver zero");
  });

  it("pause/unpause is owner-only", async () => {
    await expect(vault.connect(user).pause()).to.be.reverted;
    await vault.connect(owner).pause();
    await expect(vault.connect(user).unpause()).to.be.reverted;
    await vault.connect(owner).unpause();
  });

  describe("timelock withdraw", function () {
    const M = 1_000_000n;
    beforeEach(async () => {
      await vault.connect(owner).fundVault(100n * M);
    });

    it("requires schedule then delay then execute", async () => {
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

    it("reverts cancel when nothing is scheduled", async () => {
      await expect(vault.connect(owner).cancelScheduledWithdrawal()).to.be.revertedWith("nothing scheduled");
    });

    it("rejects a zero-amount schedule", async () => {
      await expect(vault.connect(owner).scheduleWithdrawVault(0)).to.be.revertedWith("amount zero");
    });

    it("only owner can schedule/execute/cancel", async () => {
      await expect(vault.connect(user).scheduleWithdrawVault(1n * M)).to.be.reverted;
      await vault.connect(owner).scheduleWithdrawVault(1n * M);
      await expect(vault.connect(user).executeWithdrawVault()).to.be.reverted;
      await expect(vault.connect(user).cancelScheduledWithdrawal()).to.be.reverted;
    });

    it("caps execution at current balance", async () => {
      await vault.connect(owner).scheduleWithdrawVault(200n * M); // more than balance
      await time.increase(2 * 24 * 3600);
      const before = await usdc.balanceOf(owner.address);
      await vault.connect(owner).executeWithdrawVault();
      expect(await usdc.balanceOf(owner.address)).to.equal(before + 100n * M); // capped
      expect(await vault.vaultBalance()).to.equal(0n);
    });

    it("re-scheduling while a withdrawal is pending replaces the amount and restarts the timer", async () => {
      await vault.connect(owner).scheduleWithdrawVault(30n * M);
      const firstExecAt = await vault.withdrawExecutableAt();

      await time.increase(1 * 24 * 3600); // 1 day into the 2-day timelock, still pending
      await vault.connect(owner).scheduleWithdrawVault(10n * M); // re-schedule replaces the pending one
      const secondExecAt = await vault.withdrawExecutableAt();
      expect(secondExecAt).to.be.greaterThan(firstExecAt); // timer restarted
      expect(await vault.pendingWithdrawAmount()).to.equal(10n * M);

      // the ORIGINAL timelock would already have elapsed, but the restarted one hasn't
      await expect(vault.connect(owner).executeWithdrawVault()).to.be.revertedWith("timelock not elapsed");

      await time.increase(2 * 24 * 3600);
      const before = await usdc.balanceOf(owner.address);
      await expect(vault.connect(owner).executeWithdrawVault())
        .to.emit(vault, "VaultWithdrawExecuted").withArgs(10n * M);
      expect(await usdc.balanceOf(owner.address)).to.equal(before + 10n * M); // only the LATEST amount pays
      expect(await vault.vaultBalance()).to.equal(90n * M);
    });

    it("executes as a no-op (amount capped to zero) if the vault was drained after scheduling", async () => {
      await vault.connect(owner).setSavingCore(core.address);
      await vault.connect(owner).scheduleWithdrawVault(50n * M);
      // drain the vault entirely via the core role before the timelock elapses
      await vault.connect(core).payInterest(user.address, await vault.vaultBalance());
      expect(await vault.vaultBalance()).to.equal(0n);

      await time.increase(2 * 24 * 3600);
      const before = await usdc.balanceOf(owner.address);
      await expect(vault.connect(owner).executeWithdrawVault())
        .to.emit(vault, "VaultWithdrawExecuted").withArgs(0n);
      expect(await usdc.balanceOf(owner.address)).to.equal(before); // nothing left to withdraw
    });
  });
});
