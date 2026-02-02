import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("GroupBuyEscrow", function () {
  let usdc: any;
  let escrow: any;
  let recipient: SignerWithAddress;
  let participant1: SignerWithAddress;
  let participant2: SignerWithAddress;
  let participant3: SignerWithAddress;
  let outsider: SignerWithAddress;

  const FUNDING_GOAL = ethers.parseUnits("100", 18);
  const SHARE_BPS = [3000, 3000, 4000];
  const TIMELOCK = 3 * 24 * 60 * 60; // 3 days

  beforeEach(async function () {
    [recipient, participant1, participant2, participant3, outsider] = await ethers.getSigners();

    const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDCFactory.deploy();
    await usdc.waitForDeployment();

    // Mint to participants for testing
    await usdc.mint(participant1.address, ethers.parseUnits("40", 18));
    await usdc.mint(participant2.address, ethers.parseUnits("40", 18));
    await usdc.mint(participant3.address, ethers.parseUnits("40", 18));

    const now = (await ethers.provider.getBlock("latest"))!.timestamp;
    const expiry = now + 7 * 24 * 60 * 60;

    const EscrowFactory = await ethers.getContractFactory("GroupBuyEscrow");
    escrow = await EscrowFactory.deploy(
      await usdc.getAddress(),
      recipient.address,
      FUNDING_GOAL,
      expiry,
      TIMELOCK,
      [participant1.address, participant2.address, participant3.address],
      SHARE_BPS,
    );
    await escrow.waitForDeployment();
  });

  it("initializes with correct config", async function () {
    expect(await escrow.recipient()).to.equal(recipient.address);
    expect(await escrow.fundingGoal()).to.equal(FUNDING_GOAL);
    expect(await escrow.participantCount()).to.equal(3);
  });

  it("allows participants to deposit within their share", async function () {
    await usdc.connect(participant1).approve(await escrow.getAddress(), ethers.parseUnits("30", 18));
    await escrow.connect(participant1).deposit(ethers.parseUnits("30", 18));

    expect(await escrow.deposits(participant1.address)).to.equal(ethers.parseUnits("30", 18));
  });

  it("rejects non-participant deposits", async function () {
    await usdc.connect(outsider).approve(await escrow.getAddress(), ethers.parseUnits("1", 18));
    await expect(escrow.connect(outsider).deposit(ethers.parseUnits("1", 18))).to.be.revertedWith(
      "Not a participant",
    );
  });

  it("refunds if goal not met after expiry", async function () {
    await usdc.connect(participant1).approve(await escrow.getAddress(), ethers.parseUnits("10", 18));
    await escrow.connect(participant1).deposit(ethers.parseUnits("10", 18));

    await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine", []);

    await expect(escrow.connect(participant1).refund()).to.emit(escrow, "Refunded");
  });

  it("allows delivery confirmation and majority release", async function () {
    // Fill the goal
    await usdc.connect(participant1).approve(await escrow.getAddress(), ethers.parseUnits("30", 18));
    await usdc.connect(participant2).approve(await escrow.getAddress(), ethers.parseUnits("30", 18));
    await usdc.connect(participant3).approve(await escrow.getAddress(), ethers.parseUnits("40", 18));

    await escrow.connect(participant1).deposit(ethers.parseUnits("30", 18));
    await escrow.connect(participant2).deposit(ethers.parseUnits("30", 18));
    await escrow.connect(participant3).deposit(ethers.parseUnits("40", 18));

    await escrow.connect(recipient).confirmDelivery("https://example.com/proof");
    await escrow.connect(participant1).voteRelease();
    await escrow.connect(participant2).voteRelease();

    await expect(escrow.releaseFunds()).to.emit(escrow, "FundsReleased");
  });

  it("allows timelock refund if no delivery confirmation", async function () {
    await usdc.connect(participant1).approve(await escrow.getAddress(), ethers.parseUnits("30", 18));
    await usdc.connect(participant2).approve(await escrow.getAddress(), ethers.parseUnits("30", 18));
    await usdc.connect(participant3).approve(await escrow.getAddress(), ethers.parseUnits("40", 18));

    await escrow.connect(participant1).deposit(ethers.parseUnits("30", 18));
    await escrow.connect(participant2).deposit(ethers.parseUnits("30", 18));
    await escrow.connect(participant3).deposit(ethers.parseUnits("40", 18));

    await ethers.provider.send("evm_increaseTime", [TIMELOCK + 1]);
    await ethers.provider.send("evm_mine", []);

    await expect(escrow.connect(participant1).timelockRefund()).to.emit(escrow, "TimelockRefund");
  });
});
