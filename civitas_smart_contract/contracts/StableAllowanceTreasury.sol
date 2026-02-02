//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title StableAllowanceTreasury
 * @notice Template 3: The "Stable-Allowance" Treasury (Counter-Based)
 * @dev Allows controlled periodic releases of USDC allowances. 
 *      Owner (e.g., Parent) increments approval counter, 
 *      Recipient (e.g., Child) can claim fixed allowance amounts.
 * @author Civitas Protocol
 * 
 * Use Cases:
 * - Parent to Child remittances
 * - Controlled spending accounts
 * - Periodic stipends
 * - Educational allowances
 */
contract StableAllowanceTreasury {
	// ═════════════════════════════════════════════════════════════════════════════
	// State Variables
	// ═════════════════════════════════════════════════════════════════════════════

	/// @notice USDC token contract (Base USDC or MockUSDC for testing)
	IERC20 public immutable USDC;

	/// @notice The owner who controls approval increments (e.g., Parent)
	address public owner;

	/// @notice The recipient who can claim allowances (e.g., Child)
	address public recipient;

	/// @notice Fixed amount per allowance increment (in USDC base units - 6 decimals)
	/// @dev Example: 50 * 10^6 = 50 USDC
	uint256 public allowancePerIncrement;

	/// @notice Counter tracking how many allowances the owner has approved
	/// @dev Owner increments this to authorize more claims
	uint256 public approvalCounter;

	/// @notice Counter tracking how many allowances the recipient has claimed
	uint256 public claimedCount;

	/// @notice Treasury state
	enum State {
		Active,
		Paused,
		Terminated
	}
	State public state;

	// ═════════════════════════════════════════════════════════════════════════════
	// Events
	// ═════════════════════════════════════════════════════════════════════════════

	event TreasuryInitialized(
		address indexed owner,
		address indexed recipient,
		uint256 allowancePerIncrement
	);

	event ApprovalIncremented(
		address indexed owner,
		uint256 newApprovalCount,
		uint256 incrementAmount
	);

	event AllowanceClaimed(
		address indexed recipient,
		uint256 amount,
		uint256 claimNumber
	);

	event Deposited(address indexed from, uint256 amount, uint256 newBalance);

	event StateChanged(State oldState, State newState);

	event EmergencyWithdrawal(address indexed to, uint256 amount);

	// ═════════════════════════════════════════════════════════════════════════════
	// Modifiers
	// ═════════════════════════════════════════════════════════════════════════════

	modifier onlyOwner() {
		require(msg.sender == owner, "Only owner");
		_;
	}

	modifier onlyRecipient() {
		require(msg.sender == recipient, "Only recipient");
		_;
	}

	modifier whenActive() {
		require(state == State.Active, "Treasury not active");
		_;
	}

	// ═════════════════════════════════════════════════════════════════════════════
	// Constructor
	// ═════════════════════════════════════════════════════════════════════════════

	/**
	 * @notice Initialize the treasury
	 * @param _usdcAddress The USDC token contract address
	 * @param _owner The owner address (parent/controller)
	 * @param _recipient The recipient address (child/beneficiary)
	 * @param _allowancePerIncrement Fixed USDC amount per allowance
	 */
	constructor(
		address _usdcAddress,
		address _owner,
		address _recipient,
		uint256 _allowancePerIncrement
	) {
		require(_usdcAddress != address(0), "Invalid USDC address");
		require(_owner != address(0), "Invalid owner");
		require(_recipient != address(0), "Invalid recipient");
		require(_allowancePerIncrement > 0, "Invalid allowance amount");
		require(_owner != _recipient, "Owner cannot be recipient");

		USDC = IERC20(_usdcAddress);
		owner = _owner;
		recipient = _recipient;
		allowancePerIncrement = _allowancePerIncrement;
		approvalCounter = 0;
		claimedCount = 0;
		state = State.Active;

		emit TreasuryInitialized(_owner, _recipient, _allowancePerIncrement);
	}

	// ═════════════════════════════════════════════════════════════════════════════
	// Core Functions
	// ═════════════════════════════════════════════════════════════════════════════

	/**
	 * @notice Owner increments the approval counter to authorize more claims
	 * @param _incrementBy Number of allowances to approve (default 1)
	 * @dev Owner can approve multiple allowances at once for "fast-tracking"
	 * 
	 * Example:
	 * - incrementCounter(1) → Approves 1 allowance
	 * - incrementCounter(3) → Approves 3 allowances at once (e.g., for travel)
	 */
	function incrementCounter(uint256 _incrementBy) external onlyOwner whenActive {
		require(_incrementBy > 0, "Must increment by at least 1");

		approvalCounter += _incrementBy;

		emit ApprovalIncremented(
			msg.sender,
			approvalCounter,
			_incrementBy
		);
	}

	/**
	 * @notice Recipient claims an available allowance
	 * @dev Automatically transfers allowancePerIncrement and increments claimedCount
	 * 
	 * Requirements:
	 * - Must have unclaimed approvals (claimedCount < approvalCounter)
	 * - Contract must have sufficient USDC balance
	 * - Treasury must be active
	 */
	function claim() external onlyRecipient whenActive {
		require(claimedCount < approvalCounter, "No unclaimed allowances");

		uint256 balance = USDC.balanceOf(address(this));
		require(
			balance >= allowancePerIncrement,
			"Insufficient treasury balance"
		);

		claimedCount++;

		// Transfer the allowance
		bool success = USDC.transfer(recipient, allowancePerIncrement);
		require(success, "Transfer failed");

		emit AllowanceClaimed(recipient, allowancePerIncrement, claimedCount);
	}

	/**
	 * @notice Deposit USDC into the treasury
	 * @param _amount Amount of USDC to deposit (must have approval)
	 * @dev Anyone can deposit to fund the treasury
	 */
	function deposit(uint256 _amount) external {
		require(_amount > 0, "Must deposit more than 0");

		bool success = USDC.transferFrom(msg.sender, address(this), _amount);
		require(success, "Transfer failed");

		emit Deposited(msg.sender, _amount, USDC.balanceOf(address(this)));
	}

	// ═════════════════════════════════════════════════════════════════════════════
	// View Functions
	// ═════════════════════════════════════════════════════════════════════════════

	/**
	 * @notice Get the number of unclaimed allowances available
	 * @return Number of allowances ready to be claimed
	 */
	function unclaimedAllowances() external view returns (uint256) {
		if (approvalCounter > claimedCount) {
			return approvalCounter - claimedCount;
		}
		return 0;
	}

	/**
	 * @notice Get the current USDC balance of the treasury
	 * @return Treasury balance in USDC (6 decimals)
	 */
	function treasuryBalance() external view returns (uint256) {
		return USDC.balanceOf(address(this));
	}

	/**
	 * @notice Get comprehensive treasury status
	 * @return _owner Owner address
	 * @return _recipient Recipient address
	 * @return _allowancePerIncrement Amount per claim
	 * @return _approvalCounter Total approvals given
	 * @return _claimedCount Total claims made
	 * @return _unclaimed Available claims
	 * @return _balance Current USDC balance
	 * @return _state Current state
	 */
	function getTreasuryStatus()
		external
		view
		returns (
			address _owner,
			address _recipient,
			uint256 _allowancePerIncrement,
			uint256 _approvalCounter,
			uint256 _claimedCount,
			uint256 _unclaimed,
			uint256 _balance,
			State _state
		)
	{
		uint256 unclaimed = 0;
		if (approvalCounter > claimedCount) {
			unclaimed = approvalCounter - claimedCount;
		}

		return (
			owner,
			recipient,
			allowancePerIncrement,
			approvalCounter,
			claimedCount,
			unclaimed,
			USDC.balanceOf(address(this)),
			state
		);
	}

	// ═════════════════════════════════════════════════════════════════════════════
	// State Management Functions
	// ═════════════════════════════════════════════════════════════════════════════

	/**
	 * @notice Pause the treasury (prevents claims and approvals)
	 * @dev Owner can pause in case of emergency or dispute
	 */
	function pause() external onlyOwner {
		require(state == State.Active, "Not active");
		State oldState = state;
		state = State.Paused;
		emit StateChanged(oldState, state);
	}

	/**
	 * @notice Unpause the treasury
	 */
	function unpause() external onlyOwner {
		require(state == State.Paused, "Not paused");
		State oldState = state;
		state = State.Active;
		emit StateChanged(oldState, state);
	}

	/**
	 * @notice Terminate the treasury and return remaining funds
	 * @dev Owner can terminate and withdraw all remaining USDC
	 *      This is a final action and cannot be reversed
	 */
	function terminate() external onlyOwner {
		State oldState = state;
		state = State.Terminated;

		uint256 balance = USDC.balanceOf(address(this));
		if (balance > 0) {
			bool success = USDC.transfer(owner, balance);
			require(success, "Transfer failed");
			emit EmergencyWithdrawal(owner, balance);
		}

		emit StateChanged(oldState, state);
	}

	/**
	 * @notice Emergency withdrawal (only when paused or terminated)
	 * @dev Safety mechanism for owner to recover funds in emergencies
	 */
	function emergencyWithdraw() external onlyOwner {
		require(
			state == State.Paused || state == State.Terminated,
			"Must pause or terminate first"
		);

		uint256 balance = USDC.balanceOf(address(this));
		require(balance > 0, "No balance to withdraw");

		bool success = USDC.transfer(owner, balance);
		require(success, "Transfer failed");

		emit EmergencyWithdrawal(owner, balance);
	}

	// ═════════════════════════════════════════════════════════════════════════════
	// Receive Function (for handling direct USDC transfers)
	// ═════════════════════════════════════════════════════════════════════════════

	/**
	 * @notice Handle direct USDC transfers
	 * @dev Contract can receive USDC via transfer() or transferFrom()
	 */
	receive() external payable {
		// Contract doesn't accept ETH, only USDC via deposit() or transferFrom()
		revert("Use deposit() function for USDC");
	}
}
