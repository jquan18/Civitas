import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

/**
 * Deploys the StableAllowanceTreasury contract
 * 
 * For production: Use a Factory pattern with OpenZeppelin Clones (EIP-1167)
 * for gas-efficient deployments
 * 
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployStableAllowanceTreasury: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("\n🏦 Deploying StableAllowanceTreasury...");

  // Get USDC address (MockUSDC for local, real USDC for Base networks)
  let usdcAddress: string;
  
  if (hre.network.name === "localhost" || hre.network.name === "hardhat") {
    // Use MockUSDC on local networks
    const mockUSDC = await hre.ethers.getContract("MockUSDC");
    usdcAddress = await mockUSDC.getAddress();
    console.log("   Using MockUSDC at:", usdcAddress);
  } else if (hre.network.name === "baseSepolia") {
    // Use real USDC on Base Sepolia
    usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
    console.log("   Using Base Sepolia USDC at:", usdcAddress);
  } else if (hre.network.name === "base") {
    // Use real USDC on Base Mainnet
    usdcAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    console.log("   Using Base Mainnet USDC at:", usdcAddress);
  } else {
    throw new Error(`Unsupported network: ${hre.network.name}`);
  }

  // Production addresses for Base Sepolia
  const ownerAddress = "0x09A25B9f46F23371230B2070Cd42cBCb027Ca41B";
  const recipientAddress = "0x55A52DCF57Daa06059ec9F2e7E7e7a5c50534e0a";
  const allowanceAmount = hre.ethers.parseUnits("1", 6); // 1 USDC per withdrawal

  await deploy("StableAllowanceTreasury", {
    from: deployer,
    args: [usdcAddress, ownerAddress, recipientAddress, allowanceAmount],
    log: true,
    autoMine: true,
  });

  // Get the deployed contract
  const stableAllowanceTreasury = await hre.ethers.getContract<Contract>("StableAllowanceTreasury", deployer);
  const treasuryAddress = await stableAllowanceTreasury.getAddress();

  console.log("✅ StableAllowanceTreasury deployed to:", treasuryAddress);

  console.log("\n📝 Treasury Configuration:");
  console.log("   Owner:", ownerAddress);
  console.log("   Recipient:", recipientAddress);
  console.log("   Allowance per claim: 1 USDC");
  console.log("\n🌐 Network:", hre.network.name);
  console.log("\n💡 For production:");
  console.log("   1. Deploy a Factory contract that uses OpenZeppelin Clones (EIP-1167)");
  console.log("   2. Factory creates minimal proxies for gas efficiency");
  console.log("   3. Each treasury is deployed via: factory.deployTreasury(...)");
  console.log("\n🔗 Template Info:");
  console.log("   - Target: Remittances and controlled spending (Parent to Child)");
  console.log("   - Token: USDC on Base (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)");
  console.log("   - Pattern: Counter-based allowance releases");

  // Log function calls for testing
  if (hre.network.name === "localhost" || hre.network.name === "hardhat") {
    console.log("\n🎮 Try these commands on the Debug page:");
    console.log("   - incrementCounter(1)    // Approve 1 allowance");
    console.log("   - incrementCounter(5)    // Fast-track 5 allowances");
    console.log("   - unclaimedAllowances()  // Check available claims");
    console.log("   - getTreasuryStatus()    // View full status");
    console.log("   - treasuryBalance()      // Check USDC balance");
  }
};

export default deployStableAllowanceTreasury;

// Tags for selective deployment
deployStableAllowanceTreasury.tags = ["StableAllowanceTreasury", "treasury", "template3"];
// Ensure MockUSDC is deployed first on local networks
deployStableAllowanceTreasury.dependencies = ["MockUSDC"];
