//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title RentVault
 * @notice Template 1: "Civitas" Multi-Tenant Rent Vault (Single Use)
 * @dev Tenants deposit their share of rent; landlord can withdraw once fully funded.
 *      Landlord can refund all deposits if a tenant refuses to pay.
 */
contract RentVault {
	// ═════════════════════════════════════════════════════════════════════════════
	// State
	// ═════════════════════════════════════════════════════════════════════════════
IERC20 public immutable USDC;
address public immutable recipient;
	uint256 public immutable rentAmount;
	uint256 public immutable dueDate;

	uint256 public totalDeposited;
	bool public withdrawn;

	mapping(address => uint256) public tenantBalances;
	mapping(address => uint256) public shareBps;
	mapping(address => bool) public isTenant;

	// ═════════════════════════════════════════════════════════════════════════════
	// Events
	// ═════════════════════════════════════════════════════════════════════════════
	event Deposited(address indexed tenant, uint256 amount, uint256 totalDeposited);
	event RentFullyFunded(uint256 totalDeposited);
	event WithdrawnToLandlord(address indexed landlord, uint256 amount);
	event Refunded(address indexed tenant, uint256 amount);

	// ═════════════════════════════════════════════════════════════════════════════
	// Modifiers
	// ═════════════════════════════════════════════════════════════════════════════
modifier onlyRecipient() {
	require(msg.sender == recipient, "Only recipient");
		_;
	}

	modifier onlyTenant() {
		require(isTenant[msg.sender], "Only tenant");
		_;
	}

	// ═════════════════════════════════════════════════════════════════════════════
	// Constructor
	// ═════════════════════════════════════════════════════════════════════════════
	constructor(
		address _usdcAddress,
	address _recipient,
		uint256 _rentAmount,
		uint256 _dueDate,
		address[] memory _tenants,
		uint256[] memory _shareBps
	) {
		require(_usdcAddress != address(0), "Invalid USDC address");
	require(_recipient != address(0), "Invalid recipient");
		require(_rentAmount > 0, "Invalid rent amount");
		require(_dueDate > block.timestamp, "Invalid due date");
		require(_tenants.length > 0, "No tenants");
		require(_tenants.length == _shareBps.length, "Array length mismatch");

		uint256 totalBps = 0;
		for (uint256 i = 0; i < _tenants.length; i++) {
			address tenant = _tenants[i];
			uint256 bps = _shareBps[i];
			require(tenant != address(0), "Invalid tenant");
			require(bps > 0, "Invalid share bps");
			require(!isTenant[tenant], "Duplicate tenant");

			isTenant[tenant] = true;
			shareBps[tenant] = bps;
			totalBps += bps;
		}
		require(totalBps == 10000, "Shares must equal 10000 bps");

	USDC = IERC20(_usdcAddress);
	recipient = _recipient;
		rentAmount = _rentAmount;
		dueDate = _dueDate;
	}

	// ═════════════════════════════════════════════════════════════════════════════
	// Core Actions
	// ═════════════════════════════════════════════════════════════════════════════
	function deposit(uint256 amount) external onlyTenant {
		require(!withdrawn, "Already withdrawn");
		require(amount > 0, "Amount must be > 0");
		require(block.timestamp <= dueDate, "Past due date");
		require(totalDeposited < rentAmount, "Rent already funded");

		uint256 maxContribution = (rentAmount * shareBps[msg.sender] + 9999) / 10000;
		require(tenantBalances[msg.sender] + amount <= maxContribution, "Exceeds tenant share");
		require(totalDeposited + amount <= rentAmount, "Exceeds rent amount");

		tenantBalances[msg.sender] += amount;
		totalDeposited += amount;

		require(USDC.transferFrom(msg.sender, address(this), amount), "USDC transfer failed");

		if (totalDeposited == rentAmount) {
			emit RentFullyFunded(totalDeposited);
		}

		emit Deposited(msg.sender, amount, totalDeposited);
	}

function withdrawToRecipient() external onlyRecipient {
		require(!withdrawn, "Already withdrawn");
		require(totalDeposited == rentAmount, "Not fully funded");

		withdrawn = true;
		uint256 balance = USDC.balanceOf(address(this));
	require(USDC.transfer(recipient, balance), "USDC transfer failed");

	emit WithdrawnToLandlord(recipient, balance);
	}

function refundAll(address[] calldata tenants) external onlyRecipient {
		require(!withdrawn, "Already withdrawn");
		require(totalDeposited < rentAmount, "Already fully funded");

		for (uint256 i = 0; i < tenants.length; i++) {
			address tenant = tenants[i];
			if (!isTenant[tenant]) continue;
			uint256 amount = tenantBalances[tenant];
			if (amount == 0) continue;
			tenantBalances[tenant] = 0;
			totalDeposited -= amount;
			require(USDC.transfer(tenant, amount), "USDC transfer failed");
			emit Refunded(tenant, amount);
		}
	}

	// ═════════════════════════════════════════════════════════════════════════════
	// Views
	// ═════════════════════════════════════════════════════════════════════════════
	function tenantMaxContribution(address tenant) external view returns (uint256) {
		if (!isTenant[tenant]) return 0;
		return (rentAmount * shareBps[tenant] + 9999) / 10000;
	}
	function isRecipient(address account) external view returns (bool) {
		return account == recipient;
	}
}
