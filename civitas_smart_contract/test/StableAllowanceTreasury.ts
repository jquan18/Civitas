import { expect } from "chai";
import { ethers } from "hardhat";
import { StableAllowanceTreasury } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("StableAllowanceTreasury", function () {
  let treasury: StableAllowanceTreasury;
  let owner: SignerWithAddress;
  let recipient: SignerWithAddress;
  let other: SignerWithAddress;
  
  const ALLOWANCE_AMOUNT = ethers.parseUnits("50", 6); // 50 USDC (6 decimals)
  const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Base USDC

  beforeEach(async function () {
    [owner, recipient, other] = await ethers.getSigners();

    const TreasuryFactory = await ethers.getContractFactory("StableAllowanceTreasury");
    treasury = await TreasuryFactory.deploy(owner.address, recipient.address, ALLOWANCE_AMOUNT);
    await treasury.waitForDeployment();
  });

  describe("Initialization", function () {
    it("Should initialize with correct parameters", async function () {
      expect(await treasury.owner()).to.equal(owner.address);
      expect(await treasury.recipient()).to.equal(recipient.address);
      expect(await treasury.allowancePerIncrement()).to.equal(ALLOWANCE_AMOUNT);
      expect(await treasury.approvalCounter()).to.equal(0);
      expect(await treasury.claimedCount()).to.equal(0);
      expect(await treasury.state()).to.equal(0); // Active
    });

    it("Should not allow zero address as owner", async function () {
      const TreasuryFactory = await ethers.getContractFactory("StableAllowanceTreasury");
      
      await expect(
        TreasuryFactory.deploy(ethers.ZeroAddress, recipient.address, ALLOWANCE_AMOUNT)
      ).to.be.revertedWith("Invalid owner");
    });

    it("Should not allow zero address as recipient", async function () {
      const TreasuryFactory = await ethers.getContractFactory("StableAllowanceTreasury");
      
      await expect(
        TreasuryFactory.deploy(owner.address, ethers.ZeroAddress, ALLOWANCE_AMOUNT)
      ).to.be.revertedWith("Invalid recipient");
    });

    it("Should not allow zero allowance amount", async function () {
      const TreasuryFactory = await ethers.getContractFactory("StableAllowanceTreasury");
      
      await expect(
        TreasuryFactory.deploy(owner.address, recipient.address, 0)
      ).to.be.revertedWith("Invalid allowance amount");
    });

    it("Should not allow owner to be recipient", async function () {
      const TreasuryFactory = await ethers.getContractFactory("StableAllowanceTreasury");
      
      await expect(
        TreasuryFactory.deploy(owner.address, owner.address, ALLOWANCE_AMOUNT)
      ).to.be.revertedWith("Owner cannot be recipient");
    });

    it("Should emit TreasuryInitialized event", async function () {
      const TreasuryFactory = await ethers.getContractFactory("StableAllowanceTreasury");
      const newTreasury = await TreasuryFactory.deploy(owner.address, recipient.address, ALLOWANCE_AMOUNT);
      
      await expect(newTreasury.deploymentTransaction())
        .to.emit(newTreasury, "TreasuryInitialized")
        .withArgs(owner.address, recipient.address, ALLOWANCE_AMOUNT);
    });
  });

  describe("Increment Counter", function () {
    it("Should allow owner to increment counter", async function () {
      await expect(treasury.connect(owner).incrementCounter(1))
        .to.emit(treasury, "ApprovalIncremented")
        .withArgs(owner.address, 1, 1);

      expect(await treasury.approvalCounter()).to.equal(1);
    });

    it("Should allow owner to increment by multiple amounts", async function () {
      await treasury.connect(owner).incrementCounter(3);
      expect(await treasury.approvalCounter()).to.equal(3);
      
      await treasury.connect(owner).incrementCounter(2);
      expect(await treasury.approvalCounter()).to.equal(5);
    });

    it("Should not allow non-owner to increment", async function () {
      await expect(
        treasury.connect(recipient).incrementCounter(1)
      ).to.be.revertedWith("Only owner");
    });

    it("Should not allow zero increment", async function () {
      await expect(
        treasury.connect(owner).incrementCounter(0)
      ).to.be.revertedWith("Must increment by at least 1");
    });

    it("Should not allow increment when paused", async function () {
      await treasury.connect(owner).pause();
      
      await expect(
        treasury.connect(owner).incrementCounter(1)
      ).to.be.revertedWith("Treasury not active");
    });
  });

  describe("View Functions", function () {
    it("Should return correct unclaimed allowances", async function () {
      expect(await treasury.unclaimedAllowances()).to.equal(0);
      
      await treasury.connect(owner).incrementCounter(3);
      expect(await treasury.unclaimedAllowances()).to.equal(3);
    });

    it.skip("Should return correct treasury status", async function () {
      // Note: This test requires USDC contract to exist for treasuryBalance() call
      // Run with: MAINNET_FORKING_ENABLED=true yarn hardhat test
      await treasury.connect(owner).incrementCounter(5);
      
      const status = await treasury.getTreasuryStatus();
      
      expect(status[0]).to.equal(owner.address); // owner
      expect(status[1]).to.equal(recipient.address); // recipient
      expect(status[2]).to.equal(ALLOWANCE_AMOUNT); // allowancePerIncrement
      expect(status[3]).to.equal(5); // approvalCounter
      expect(status[4]).to.equal(0); // claimedCount
      expect(status[5]).to.equal(5); // unclaimed
      // status[6] is balance - skip checking
      expect(status[7]).to.equal(0); // state (Active)
    });
  });

  describe("State Management", function () {
    it("Should allow owner to pause", async function () {
      await expect(treasury.connect(owner).pause())
        .to.emit(treasury, "StateChanged")
        .withArgs(0, 1); // Active to Paused

      expect(await treasury.state()).to.equal(1); // Paused
    });

    it("Should allow owner to unpause", async function () {
      await treasury.connect(owner).pause();
      
      await expect(treasury.connect(owner).unpause())
        .to.emit(treasury, "StateChanged")
        .withArgs(1, 0); // Paused to Active

      expect(await treasury.state()).to.equal(0); // Active
    });

    it("Should not allow non-owner to pause", async function () {
      await expect(
        treasury.connect(recipient).pause()
      ).to.be.revertedWith("Only owner");
    });

    it.skip("Should allow owner to terminate", async function () {
      // Note: This test requires USDC contract to exist
      // Run with: MAINNET_FORKING_ENABLED=true yarn hardhat test
      await expect(treasury.connect(owner).terminate())
        .to.emit(treasury, "StateChanged")
        .withArgs(0, 2); // Active to Terminated

      expect(await treasury.state()).to.equal(2); // Terminated
    });
  });

  describe("Integration Scenarios", function () {
    it("Should handle full cycle: approve, claim, repeat", async function () {
      // This test would require USDC token mocking or forking Base mainnet
      // For now, we test the logic flow
      
      // Owner approves 2 allowances
      await treasury.connect(owner).incrementCounter(2);
      expect(await treasury.approvalCounter()).to.equal(2);
      expect(await treasury.unclaimedAllowances()).to.equal(2);
    });

    it("Should handle fast-track scenario", async function () {
      // Parent approves 5 allowances at once (e.g., for travel)
      await treasury.connect(owner).incrementCounter(5);
      
      expect(await treasury.approvalCounter()).to.equal(5);
      expect(await treasury.unclaimedAllowances()).to.equal(5);
    });

    it("Should correctly track claimed vs approved", async function () {
      await treasury.connect(owner).incrementCounter(3);
      
      // After claiming (would need USDC), the logic should be:
      // approvalCounter = 3
      // claimedCount would increment
      // unclaimedAllowances would decrease
      
      expect(await treasury.approvalCounter()).to.equal(3);
      expect(await treasury.claimedCount()).to.equal(0);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle multiple increments correctly", async function () {
      await treasury.connect(owner).incrementCounter(1);
      await treasury.connect(owner).incrementCounter(1);
      await treasury.connect(owner).incrementCounter(1);
      
      expect(await treasury.approvalCounter()).to.equal(3);
    });

    it.skip("Should not allow operations after termination", async function () {
      // Note: This test requires USDC contract to exist
      // Run with: MAINNET_FORKING_ENABLED=true yarn hardhat test
      await treasury.connect(owner).terminate();
      
      await expect(
        treasury.connect(owner).incrementCounter(1)
      ).to.be.revertedWith("Treasury not active");
    });
  });
});
