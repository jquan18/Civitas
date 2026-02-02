import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployGroupBuyEscrow: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("\n🛒 Deploying GroupBuyEscrow...");

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
    process.env.GROUPBUY_RECIPIENT || process.env.GROUPBUY_PURCHASER || (await accounts[0].getAddress());

  let participants: string[] = [];
  let sharesBps: number[] = [];

  if (isLocal) {
    participants = [
      await accounts[1].getAddress(),
      await accounts[2].getAddress(),
      await accounts[3].getAddress(),
    ];
    sharesBps = [3000, 3000, 4000];
  } else {
    const participantsEnv = process.env.GROUPBUY_PARTICIPANTS;
    const sharesEnv = process.env.GROUPBUY_SHARES_BPS;

    if (!participantsEnv || !sharesEnv) {
      throw new Error(
        "Missing GROUPBUY_PARTICIPANTS or GROUPBUY_SHARES_BPS env vars for live deployment",
      );
    }

    participants = participantsEnv
      .split(",")
      .map(value => value.trim())
      .filter(Boolean);

    sharesBps = sharesEnv
      .split(",")
      .map(value => value.trim())
      .filter(Boolean)
      .map(value => Number(value));

    const invalidParticipants = participants.filter(address => !hre.ethers.isAddress(address));
    if (invalidParticipants.length > 0) {
      throw new Error(
        `Invalid participant addresses: ${invalidParticipants.join(
          ", ",
        )}. Remove any "..." or extra characters in GROUPBUY_PARTICIPANTS.`,
      );
    }

    if (participants.length !== sharesBps.length) {
      throw new Error("Participants and shares length mismatch");
    }

    const totalBps = sharesBps.reduce((sum, value) => sum + value, 0);
    if (totalBps !== 10000) {
      throw new Error("Shares must sum to 10000 bps");
    }
  }

  const fundingGoal = hre.ethers.parseUnits(process.env.GROUPBUY_GOAL_USDC || "100", 6);
  const now = Math.floor(Date.now() / 1000);
  const expiryRaw = Number(process.env.GROUPBUY_EXPIRY_TIMESTAMP);
  const expiryCandidate = expiryRaw
    ? expiryRaw > 10_000_000_000
      ? Math.floor(expiryRaw / 1000)
      : expiryRaw
    : 0;
  const expiryDate = expiryCandidate > now ? expiryCandidate : now + 7 * 24 * 60 * 60;
  if (expiryRaw && expiryCandidate <= now) {
    console.warn(
      "⚠️ GROUPBUY_EXPIRY_TIMESTAMP is not in the future. Falling back to now + 7 days.",
    );
  }
  const timelockRefundDelay =
    Number(process.env.GROUPBUY_TIMELOCK_SECONDS) || 3 * 24 * 60 * 60;

  await deploy("GroupBuyEscrow", {
    from: deployer,
    args: [
      usdcAddress,
      recipient,
      fundingGoal,
      expiryDate,
      timelockRefundDelay,
      participants,
      sharesBps,
    ],
    log: true,
    autoMine: true,
  });

  console.log("✅ GroupBuyEscrow deployed");
  console.log("   Recipient:", recipient);
  console.log("   Participants:", participants.join(", "));
  console.log("   Shares (bps):", sharesBps.join(", "));
  console.log("   Funding goal: 100 USDC");
};

export default deployGroupBuyEscrow;

deployGroupBuyEscrow.tags = ["GroupBuyEscrow", "groupbuy", "template2"];
deployGroupBuyEscrow.dependencies = [];
