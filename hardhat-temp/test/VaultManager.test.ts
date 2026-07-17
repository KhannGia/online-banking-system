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
});
