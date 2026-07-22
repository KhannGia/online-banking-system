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
