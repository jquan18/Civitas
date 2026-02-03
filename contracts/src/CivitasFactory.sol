// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./RentVault.sol";
import "./GroupBuyEscrow.sol";
import "./StableAllowanceTreasury.sol";

/**
 * @title CivitasFactory
 * @notice Unified factory for deploying all Civitas contract templates via EIP-1167 clones
 */
contract CivitasFactory is Ownable {
    using Clones for address;

    IERC20 public immutable usdc;

    address public rentVaultImpl;
    address public groupBuyEscrowImpl;
    address public stableAllowanceTreasuryImpl;

    // Events
    event RentVaultCreated(address indexed creator, address indexed clone, address indexed recipient);
    event GroupBuyEscrowCreated(address indexed creator, address indexed clone, address indexed recipient);
    event TreasuryCreated(address indexed creator, address indexed clone, address indexed owner_);

    constructor(
        address _usdc,
        address _rentVaultImpl,
        address _groupBuyEscrowImpl,
        address _stableAllowanceTreasuryImpl
    ) Ownable() {
        require(_usdc != address(0), "Invalid USDC");
        require(_rentVaultImpl != address(0), "Invalid RentVault impl");
        require(_groupBuyEscrowImpl != address(0), "Invalid GroupBuyEscrow impl");
        require(_stableAllowanceTreasuryImpl != address(0), "Invalid Treasury impl");

        usdc = IERC20(_usdc);
        rentVaultImpl = _rentVaultImpl;
        groupBuyEscrowImpl = _groupBuyEscrowImpl;
        stableAllowanceTreasuryImpl = _stableAllowanceTreasuryImpl;
    }

    // ─── Create Functions ─────────────────────────────────────────────────────

    function createRentVault(
        address _recipient,
        uint256 _rentAmount,
        uint256 _dueDate,
        address[] calldata _tenants,
        uint256[] calldata _shareBps
    ) external returns (address clone) {
        clone = rentVaultImpl.clone();

        RentVault(clone).initialize(
            address(usdc),
            _recipient,
            _rentAmount,
            _dueDate,
            _tenants,
            _shareBps
        );

        emit RentVaultCreated(msg.sender, clone, _recipient);
    }

    function createGroupBuyEscrow(
        address _recipient,
        uint256 _fundingGoal,
        uint256 _expiryDate,
        uint256 _timelockRefundDelay,
        address[] calldata _participants,
        uint256[] calldata _shareBps
    ) external returns (address clone) {
        clone = groupBuyEscrowImpl.clone();

        GroupBuyEscrow(clone).initialize(
            address(usdc),
            _recipient,
            _fundingGoal,
            _expiryDate,
            _timelockRefundDelay,
            _participants,
            _shareBps
        );

        emit GroupBuyEscrowCreated(msg.sender, clone, _recipient);
    }

    function createStableAllowanceTreasury(
        address _owner,
        address _recipient,
        uint256 _allowancePerIncrement
    ) external returns (address clone) {
        clone = stableAllowanceTreasuryImpl.clone();

        StableAllowanceTreasury(payable(clone)).initialize(
            address(usdc),
            _owner,
            _recipient,
            _allowancePerIncrement
        );

        emit TreasuryCreated(msg.sender, clone, _owner);
    }

    // ─── Admin Functions ──────────────────────────────────────────────────────

    function setRentVaultImpl(address _impl) external onlyOwner {
        require(_impl != address(0), "Invalid address");
        rentVaultImpl = _impl;
    }

    function setGroupBuyEscrowImpl(address _impl) external onlyOwner {
        require(_impl != address(0), "Invalid address");
        groupBuyEscrowImpl = _impl;
    }

    function setStableAllowanceTreasuryImpl(address _impl) external onlyOwner {
        require(_impl != address(0), "Invalid address");
        stableAllowanceTreasuryImpl = _impl;
    }
}
