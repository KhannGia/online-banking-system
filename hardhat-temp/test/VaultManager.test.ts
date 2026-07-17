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
