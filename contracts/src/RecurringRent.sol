// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract RecurringRent is Initializable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;

    // Base USDC - hardcoded for security and consistency
    IERC20 public constant USDC = IERC20(0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913);

    address public landlord;
    address public tenant;
    uint256 public monthlyAmount;
    uint8 public totalMonths;
    uint256 public startTime;
    uint256 public totalPaid;

    enum State { Deployed, Active, Completed, TerminationPending, Terminated }
    State public state;
    uint256 public terminationNoticeTime;

    event ContractActivated(uint256 startTime);
    event RentReleased(uint256 amount, uint256 totalPaid);
    event TerminationInitiated(uint256 noticeTime);
    event ContractTerminated(uint256 refundAmount);

    function initialize(
        address _landlord,
        address _tenant,
        uint256 _monthlyAmount,
        uint8 _totalMonths
    ) external initializer {
        require(_landlord != address(0), "Invalid landlord");
        require(_tenant != address(0), "Invalid tenant");
        require(_monthlyAmount > 0, "Invalid amount");
        require(_totalMonths > 0 && _totalMonths <= 60, "Invalid duration");

        __ReentrancyGuard_init();

        landlord = _landlord;
        tenant = _tenant;
        monthlyAmount = _monthlyAmount;
        totalMonths = _totalMonths;
        state = State.Deployed;
    }

    // Balance-based activation (handles async LI.FI funding)
    function checkAndActivate() public {
        if (state == State.Deployed &&
            USDC.balanceOf(address(this)) >= monthlyAmount * totalMonths) {
            state = State.Active;
            // Contract term starts when funding completes, not when created
            startTime = block.timestamp;
            emit ContractActivated(startTime);
        }
    }

    // Permissionless rent release
    function releasePendingRent() external nonReentrant {
        // Auto-activate if funded but not yet active
        checkAndActivate();
        require(state == State.Active, "Not active");

        // Note: Rounds down to complete months (30 days each)
        uint256 monthsElapsed = (block.timestamp - startTime) / 30 days;
        if (monthsElapsed > totalMonths) monthsElapsed = totalMonths;

        uint256 monthsPaid = totalPaid / monthlyAmount;
        uint256 toPay = (monthsElapsed - monthsPaid) * monthlyAmount;

        require(toPay > 0, "Nothing to release");

        totalPaid += toPay;
        USDC.safeTransfer(landlord, toPay);

        emit RentReleased(toPay, totalPaid);

        if (totalPaid >= monthlyAmount * totalMonths) {
            state = State.Completed;
        }
    }

    // Early termination (30-day notice)
    function initiateTermination() external {
        require(msg.sender == landlord, "Only landlord");
        require(state == State.Active, "Not active");
        terminationNoticeTime = block.timestamp;
        state = State.TerminationPending;
        emit TerminationInitiated(terminationNoticeTime);
    }

    function finalizeTermination() external nonReentrant {
        require(state == State.TerminationPending, "Not pending");
        require(block.timestamp >= terminationNoticeTime + 30 days, "Notice period");

        // Pro-rata refund
        uint256 monthsElapsed = (block.timestamp - startTime) / 30 days;
        uint256 owedToLandlord = monthsElapsed * monthlyAmount;

        if (owedToLandlord > totalPaid) {
            uint256 payment = owedToLandlord - totalPaid;
            totalPaid += payment;
            USDC.safeTransfer(landlord, payment);
        }

        uint256 refund = USDC.balanceOf(address(this));
        if (refund > 0) {
            USDC.safeTransfer(tenant, refund);
        }

        state = State.Terminated;
        emit ContractTerminated(refund);
    }
}
