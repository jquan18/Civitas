import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployRentVault: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("\n🏠 Deploying RentVault...");

  let usdcAddress: string;
  if (hre.network.name === "localhost" || hre.network.name === "hardhat") {
    const mockUSDC = await hre.ethers.getContract("MockUSDC");
    usdcAddress = await mockUSDC.getAddress();
    console.log("   Using MockUSDC at:", usdcAddress);
  } else if (hre.network.name === "baseSepolia") {
    usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
    console.log("   Using Base Sepolia USDC at:", usdcAddress);
  } else if (hre.network.name === "base") {
    usdcAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    console.log("   Using Base Mainnet USDC at:", usdcAddress);
  } else {
    throw new Error(`Unsupported network: ${hre.network.name}`);
  }

  const isLocal = hre.network.name === "localhost" || hre.network.name === "hardhat";
  const accounts = await hre.ethers.getSigners();

  const recipient =
    process.env.RENT_RECIPIENT || process.env.RENT_LANDLORD || (await accounts[0].getAddress());

  let tenants: string[] = [];
  let sharesBps: number[] = [];

  if (isLocal) {
    tenants = [await accounts[1].getAddress(), await accounts[2].getAddress()];
    sharesBps = [5000, 5000];
  } else {
    const tenantsEnv = process.env.RENT_TENANTS;
    const sharesEnv = process.env.RENT_SHARES_BPS;
    if (!tenantsEnv || !sharesEnv) {
      throw new Error("Missing RENT_TENANTS or RENT_SHARES_BPS env vars for live deployment");
    }

    tenants = tenantsEnv
      .split(",")
      .map(value => value.trim())
      .filter(Boolean);
    sharesBps = sharesEnv
      .split(",")
      .map(value => value.trim())
      .filter(Boolean)
      .map(value => Number(value));

    if (tenants.length !== sharesBps.length) {
      throw new Error("Tenants and shares length mismatch");
    }

    const totalBps = sharesBps.reduce((sum, value) => sum + value, 0);
    if (totalBps !== 10000) {
      throw new Error("Shares must sum to 10000 bps");
    }
  }

  const rentAmount = hre.ethers.parseUnits(process.env.RENT_AMOUNT_USDC || "100", 6);
  const now = Math.floor(Date.now() / 1000);
  const dueRaw = Number(process.env.RENT_DUE_TIMESTAMP);
  const dueCandidate = dueRaw
    ? dueRaw > 10_000_000_000
      ? Math.floor(dueRaw / 1000)
      : dueRaw
    : 0;
  const dueDate = dueCandidate > now ? dueCandidate : now + 7 * 24 * 60 * 60;
  if (dueRaw && dueCandidate <= now) {
    console.warn("⚠️ RENT_DUE_TIMESTAMP is not in the future. Falling back to now + 7 days.");
  }

  await deploy("RentVault", {
    from: deployer,
    args: [usdcAddress, recipient, rentAmount, dueDate, tenants, sharesBps],
    log: true,
    autoMine: true,
  });

  console.log("✅ RentVault deployed");
  console.log("   Recipient:", recipient);
  console.log("   Tenants:", tenants.join(", "));
  console.log("   Shares (bps):", sharesBps.join(", "));
  console.log("   Rent amount: 100 USDC");
};

export default deployRentVault;

deployRentVault.tags = ["RentVault", "rent", "template1"];
