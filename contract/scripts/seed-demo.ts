import { ethers } from "hardhat";

// Seeds 4 deposits, one per required use case, already in the right lifecycle state —
// all four owned by ONE account, so the whole demo runs from a single connected wallet
// with no MetaMask account-switching. Run against a FRESH local node (restart
// `npx hardhat node` + redeploy right before seeding) so deposit ids come out exactly
// #0-#3 as printed below.
//
//   npx hardhat run scripts/seed-demo.ts --network localhost
//
// Signers: [0] deployer/owner (funds the vault only), [1] the depositor — import THIS
// account into MetaMask, it's the only one you need for the demo.

const ONE_USDC = 1_000_000n; // 6 decimals
const AMOUNT = 1_000n * ONE_USDC; // 1,000 USDC per deposit, matches the README worked example

async function main() {
  const [deployer, demo] = await ethers.getSigners();
  const usdc = await ethers.getContract("MockUSDC", deployer);
  const vault = await ethers.getContract("VaultManager", deployer);
  const core = await ethers.getContract("SavingCore", demo);

  console.log("Deployer/owner :", deployer.address);
  console.log("Demo account (import this one into MetaMask):", demo.address);

  console.log("\nFunding vault with 2,000 USDC...");
  await (await usdc.mint(deployer.address, 2_000n * ONE_USDC)).wait();
  await (await usdc.approve(await vault.getAddress(), 2_000n * ONE_USDC)).wait();
  await (await vault.fundVault(2_000n * ONE_USDC)).wait();

  console.log("Minting 4,000 USDC to the demo account for 4 deposits...");
  await (await usdc.mint(demo.address, 4n * AMOUNT)).wait();
  await (await usdc.connect(demo).approve(await core.getAddress(), 4n * AMOUNT)).wait();

  const planId = 0n; // default 180d / 225bps / 550bps plan created at deploy
  const grace = await core.GRACE_PERIOD();
  const tenorDays = 180n;

  console.log("\nOpening deposit #0 (target: Withdraw at maturity)...");
  await (await core.connect(demo).openDeposit(planId, AMOUNT)).wait();

  console.log("Opening deposit #1 (target: Manual renew)...");
  await (await core.connect(demo).openDeposit(planId, AMOUNT)).wait();

  console.log("Opening deposit #2 (target: Auto-renew)...");
  await (await core.connect(demo).openDeposit(planId, AMOUNT)).wait();

  const jumpSeconds = Number(tenorDays * 86400n + grace) + 3600; // tenor + grace + 1h buffer
  console.log(`\nFast-forwarding the chain by ${jumpSeconds}s (past maturity + grace)...`);
  await ethers.provider.send("evm_increaseTime", [jumpSeconds]);
  await ethers.provider.send("evm_mine", []);

  console.log("\nOpening deposit #3 (target: Early withdraw — opened AFTER the jump, still fresh)...");
  await (await core.connect(demo).openDeposit(planId, AMOUNT)).wait();

  const nextId = await core.nextDepositId();
  const latest = await ethers.provider.getBlock("latest");
  const now = BigInt(latest!.timestamp);

  console.log("\n=== Deposit states right now ===");
  for (let id = 0n; id < nextId; id++) {
    const d = await core.deposits(id);
    const matured = now >= d.maturityAt;
    const pastGrace = now >= d.maturityAt + grace;
    console.log(`#${id}  status=${d.status}  matured=${matured}  pastGrace=${pastGrace}`);
  }

  console.log("\n=== Demo plan (one account, tab 'My Deposits') ===");
  console.log("  #0 -> click Withdraw           (1,000 -> 1,011.10 USDC)");
  console.log("  #1 -> click Renew              (compounds into a new deposit)");
  console.log("  #2 -> click Auto-renew         (allowed even though you own it — permissionless just means it's NOT restricted to you)");
  console.log("  #3 -> click Early withdraw     (1,000 -> 945 USDC, penalty 55)");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
