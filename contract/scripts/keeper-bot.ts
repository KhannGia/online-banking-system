import { ethers } from "hardhat";
import type { SavingCore } from "../typechain";

// Permissionless keeper bot (bonus G): scans every deposit and calls
// autoRenewDeposit() on anything that is Active and past maturity + GRACE_PERIOD,
// earning keeperRewardBps of the interest for each call.
//
// Usage:
//   npx hardhat run scripts/keeper-bot.ts --network sepolia            # loop forever
//   ONCE=1 npx hardhat run scripts/keeper-bot.ts --network sepolia     # single pass, then exit
//
// Env (optional):
//   POLL_INTERVAL_MS   ms between scans while looping (default 60_000)
//   ONCE               "1" to scan once and exit instead of looping

const DepositStatus = { Active: 0, Withdrawn: 1, ManualRenewed: 2, AutoRenewed: 3 } as const;

const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS ?? 60_000);
const RUN_ONCE = process.env.ONCE === "1";

async function scanAndRenew(core: SavingCore, keeper: string) {
  const nextId = await core.nextDepositId();
  const gracePeriod = await core.GRACE_PERIOD();
  // Use the chain's own block timestamp (not wall-clock time) — it's what the
  // contract's `require` actually checks against, and the two can drift on
  // local/test nodes where time is fast-forwarded.
  const latestBlock = await ethers.provider.getBlock("latest");
  const now = BigInt(latestBlock!.timestamp);

  console.log(`[${new Date().toISOString()}] scanning deposits 0..${nextId - 1n}`);

  for (let id = 0n; id < nextId; id++) {
    const d = await core.deposits(id);

    if (d.status !== BigInt(DepositStatus.Active)) continue;
    if (now < d.maturityAt + gracePeriod) continue;

    console.log(`  deposit #${id} is eligible (matured ${new Date(Number(d.maturityAt) * 1000).toISOString()}), renewing...`);
    try {
      const tx = await core.autoRenewDeposit(id);
      const receipt = await tx.wait();
      console.log(`  ✓ deposit #${id} renewed — tx ${receipt?.hash}`);
    } catch (err) {
      // one deposit reverting (e.g. raced by another keeper) shouldn't kill the loop
      console.error(`  ✗ deposit #${id} failed:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`[${new Date().toISOString()}] scan done (keeper: ${keeper})`);
}

async function main() {
  const [signer] = await ethers.getSigners();
  if (!signer) throw new Error("no signer configured — set TESTNET_PRIVATE_KEY in contract/.env");

  const core = await ethers.getContract<SavingCore>("SavingCore", signer);
  console.log(`Keeper bot started — SavingCore @ ${await core.getAddress()}, keeper account: ${signer.address}`);

  await scanAndRenew(core, signer.address);
  if (RUN_ONCE) return;

  console.log(`Polling every ${POLL_INTERVAL_MS}ms. Ctrl+C to stop.`);
  setInterval(() => {
    scanAndRenew(core, signer.address).catch((err) => console.error("scan error:", err));
  }, POLL_INTERVAL_MS);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
