import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("RentVault", function () {
  let usdc: any;
  let vault: any;
  let recipient: SignerWithAddress;
  let tenant1: SignerWithAddress;
  let tenant2: SignerWithAddress;
  let outsider: SignerWithAddress;

  const RENT_AMOUNT = ethers.parseUnits("100", 18);
  const SHARE_BPS = [5000, 5000];

  beforeEach(async function () {
    [recipient, tenant1, tenant2, outsider] = await ethers.getSigners();

    const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDCFactory.deploy();
    await usdc.waitForDeployment();

    await usdc.mint(tenant1.address, ethers.parseUnits("60", 18));
    await usdc.mint(tenant2.address, ethers.parseUnits("60", 18));

    const now = (await ethers.provider.getBlock("latest"))!.timestamp;
    const dueDate = now + 7 * 24 * 60 * 60;

    const RentVaultFactory = await ethers.getContractFactory("RentVault");
    vault = await RentVaultFactory.deploy(
      await usdc.getAddress(),
      recipient.address,
      RENT_AMOUNT,
      dueDate,
      [tenant1.address, tenant2.address],
      SHARE_BPS,
    );
    await vault.waitForDeployment();
  });

  it("initializes with correct config", async function () {
    expect(await vault.recipient()).to.equal(recipient.address);
    expect(await vault.rentAmount()).to.equal(RENT_AMOUNT);
  });

  it("allows tenant deposits within share", async function () {
    await usdc.connect(tenant1).approve(await vault.getAddress(), ethers.parseUnits("50", 18));
    await vault.connect(tenant1).deposit(ethers.parseUnits("50", 18));
    expect(await vault.tenantBalances(tenant1.address)).to.equal(ethers.parseUnits("50", 18));
  });

  it("rejects non-tenant deposits", async function () {
    await usdc.connect(outsider).approve(await vault.getAddress(), ethers.parseUnits("1", 18));
    await expect(vault.connect(outsider).deposit(ethers.parseUnits("1", 18))).to.be.revertedWith(
      "Only tenant",
    );
  });

  it("allows landlord withdraw once fully funded", async function () {
    await usdc.connect(tenant1).approve(await vault.getAddress(), ethers.parseUnits("50", 18));
    await usdc.connect(tenant2).approve(await vault.getAddress(), ethers.parseUnits("50", 18));
    await vault.connect(tenant1).deposit(ethers.parseUnits("50", 18));
    await vault.connect(tenant2).deposit(ethers.parseUnits("50", 18));

    await expect(vault.connect(recipient).withdrawToRecipient()).to.emit(vault, "WithdrawnToLandlord");
  });

  it("allows landlord refund when not fully funded", async function () {
    await usdc.connect(tenant1).approve(await vault.getAddress(), ethers.parseUnits("50", 18));
    await vault.connect(tenant1).deposit(ethers.parseUnits("50", 18));

    await expect(
      vault.connect(recipient).refundAll([tenant1.address, tenant2.address]),
    ).to.emit(vault, "Refunded");
  });
});
