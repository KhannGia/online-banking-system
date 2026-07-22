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
