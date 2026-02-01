// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/RecurringRent.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {
        _mint(msg.sender, 1000000 * 10**6);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

contract RecurringRentTest is Test {
    RecurringRent public rental;
    MockUSDC public usdc;
    address public landlord = address(0x1);
    address public tenant = address(0x2);
    uint256 public monthlyAmount = 1000 * 10**6; // 1000 USDC
    uint8 public totalMonths = 6;

    function setUp() public {
        usdc = new MockUSDC();
        rental = new RecurringRent();
        rental.initialize(landlord, tenant, monthlyAmount, totalMonths, address(usdc));
    }

    function testInitialization() public {
        assertEq(rental.landlord(), landlord);
        assertEq(rental.tenant(), tenant);
        assertEq(rental.monthlyAmount(), monthlyAmount);
        assertEq(rental.totalMonths(), totalMonths);
        assertTrue(rental.state() == RecurringRent.State.Deployed);
    }

    function testActivationWhenFunded() public {
        // Transfer full amount
        uint256 totalRequired = monthlyAmount * totalMonths;
        usdc.transfer(address(rental), totalRequired);

        // Check and activate
        rental.checkAndActivate();

        assertTrue(rental.state() == RecurringRent.State.Active);
        assertGt(rental.startTime(), 0);
    }

    function testNoActivationWhenPartiallyFunded() public {
        // Transfer partial amount
        usdc.transfer(address(rental), monthlyAmount * 3);

        rental.checkAndActivate();

        assertTrue(rental.state() == RecurringRent.State.Deployed);
    }

    function testReleaseRentAfterOneMonth() public {
        // Setup: fund and activate
        uint256 totalRequired = monthlyAmount * totalMonths;
        usdc.transfer(address(rental), totalRequired);
        rental.checkAndActivate();

        // Warp 1 month
        vm.warp(block.timestamp + 30 days);

        // Release rent
        uint256 landlordBalBefore = usdc.balanceOf(landlord);
        rental.releasePendingRent();
        uint256 landlordBalAfter = usdc.balanceOf(landlord);

        assertEq(landlordBalAfter - landlordBalBefore, monthlyAmount);
        assertEq(rental.totalPaid(), monthlyAmount);
    }

    function testReleaseMultipleMonths() public {
        // Setup
        uint256 totalRequired = monthlyAmount * totalMonths;
        usdc.transfer(address(rental), totalRequired);
        rental.checkAndActivate();

        // Warp 3 months
        vm.warp(block.timestamp + 90 days);

        rental.releasePendingRent();

        assertEq(rental.totalPaid(), monthlyAmount * 3);
    }

    function testInitiateTermination() public {
        // Setup
        uint256 totalRequired = monthlyAmount * totalMonths;
        usdc.transfer(address(rental), totalRequired);
        rental.checkAndActivate();

        // Landlord initiates
        vm.prank(landlord);
        rental.initiateTermination();

        assertTrue(rental.state() == RecurringRent.State.TerminationPending);
        assertGt(rental.terminationNoticeTime(), 0);
    }

    function testFinalizeTermination() public {
        // Setup and initiate
        uint256 totalRequired = monthlyAmount * totalMonths;
        usdc.transfer(address(rental), totalRequired);
        rental.checkAndActivate();

        vm.prank(landlord);
        rental.initiateTermination();

        // Warp 30 days (notice period)
        vm.warp(block.timestamp + 30 days);

        // Finalize
        uint256 tenantBalBefore = usdc.balanceOf(tenant);
        uint256 landlordBalBefore = usdc.balanceOf(landlord);
        rental.finalizeTermination();
        uint256 tenantBalAfter = usdc.balanceOf(tenant);
        uint256 landlordBalAfter = usdc.balanceOf(landlord);

        assertTrue(rental.state() == RecurringRent.State.Terminated);

        // Pro-rata: 1 month elapsed during notice period
        // Landlord gets 1 month rent, tenant gets remaining 5 months
        assertEq(landlordBalAfter - landlordBalBefore, monthlyAmount);
        assertEq(tenantBalAfter - tenantBalBefore, totalRequired - monthlyAmount);
    }
}
