// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title StableAllowanceTreasury
 * @notice Counter-Based Stable-Allowance Treasury - Initializable clone version
 * @dev Allows controlled periodic releases of USDC allowances.
 *      Owner increments approval counter, recipient claims fixed amounts.
 */
contract StableAllowanceTreasury is Initializable {
    // State
    IERC20 public USDC;
    address public owner;
    address public recipient;
    uint256 public allowancePerIncrement;

    uint256 public approvalCounter;
    uint256 public claimedCount;

    enum State { Active, Paused, Terminated }
    State public state;

    // Events
    event TreasuryInitialized(address indexed owner, address indexed recipient, uint256 allowancePerIncrement);
    event ApprovalIncremented(address indexed owner, uint256 newApprovalCount, uint256 incrementAmount);
    event AllowanceClaimed(address indexed recipient, uint256 amount, uint256 claimNumber);
    event Deposited(address indexed from, uint256 amount, uint256 newBalance);
    event StateChanged(State oldState, State newState);
    event EmergencyWithdrawal(address indexed to, uint256 amount);

    // Modifiers
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

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _usdcAddress,
        address _owner,
        address _recipient,
        uint256 _allowancePerIncrement
    ) external initializer {
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

    // Core Functions
    function incrementCounter(uint256 _incrementBy) external onlyOwner whenActive {
        require(_incrementBy > 0, "Must increment by at least 1");

        approvalCounter += _incrementBy;

        emit ApprovalIncremented(msg.sender, approvalCounter, _incrementBy);
    }

    function claim() external onlyRecipient whenActive {
        require(claimedCount < approvalCounter, "No unclaimed allowances");

        uint256 balance = USDC.balanceOf(address(this));
        require(balance >= allowancePerIncrement, "Insufficient treasury balance");

        claimedCount++;

        bool success = USDC.transfer(recipient, allowancePerIncrement);
        require(success, "Transfer failed");

        emit AllowanceClaimed(recipient, allowancePerIncrement, claimedCount);
    }

    function deposit(uint256 _amount) external {
        require(_amount > 0, "Must deposit more than 0");

        bool success = USDC.transferFrom(msg.sender, address(this), _amount);
        require(success, "Transfer failed");

        emit Deposited(msg.sender, _amount, USDC.balanceOf(address(this)));
    }

    // Views
    function unclaimedAllowances() external view returns (uint256) {
        if (approvalCounter > claimedCount) {
            return approvalCounter - claimedCount;
        }
        return 0;
    }

    function treasuryBalance() external view returns (uint256) {
        return USDC.balanceOf(address(this));
    }

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

    // State Management
    function pause() external onlyOwner {
        require(state == State.Active, "Not active");
        State oldState = state;
        state = State.Paused;
        emit StateChanged(oldState, state);
    }

    function unpause() external onlyOwner {
        require(state == State.Paused, "Not paused");
        State oldState = state;
        state = State.Active;
        emit StateChanged(oldState, state);
    }

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

    receive() external payable {
        revert("Use deposit() function for USDC");
    }

    // ─── ENS Metadata ─────────────────────────────────────────────────────────

    /**
     * @notice Returns ENS metadata for this contract
     * @dev Used by backend to automatically populate ENS text records
     * @return contractType The template type
     * @return status The current contract status
     * @return keys Array of ENS text record keys
     * @return values Array of ENS text record values
     */
    function getENSMetadata() external view returns (
        string memory contractType,
        string memory status,
        string[] memory keys,
        string[] memory values
    ) {
        contractType = "StableAllowanceTreasury";

        // Determine status string
        if (state == State.Active) {
            status = "Active";
        } else if (state == State.Paused) {
            status = "Paused";
        } else {
            status = "Terminated";
        }

        // Build metadata arrays (13 fields)
        keys = new string[](13);
        values = new string[](13);

        keys[0] = "contract.type";
        values[0] = "StableAllowanceTreasury";

        keys[1] = "contract.status";
        values[1] = status;

        keys[2] = "contract.version";
        values[2] = "1.0.0";

        keys[3] = "contract.treasury.allowancePerIncrement";
        values[3] = _uint2str(allowancePerIncrement);

        keys[4] = "contract.treasury.approvalCounter";
        values[4] = _uint2str(approvalCounter);

        keys[5] = "contract.treasury.claimedCount";
        values[5] = _uint2str(claimedCount);

        keys[6] = "contract.treasury.unclaimedCount";
        values[6] = _uint2str(approvalCounter > claimedCount ? approvalCounter - claimedCount : 0);

        keys[7] = "contract.treasury.balance";
        values[7] = _uint2str(USDC.balanceOf(address(this)));

        keys[8] = "contract.treasury.currency";
        values[8] = "USDC";

        keys[9] = "contract.treasury.currencyAddress";
        values[9] = _address2str(address(USDC));

        keys[10] = "contract.owner";
        values[10] = _address2str(owner);

        keys[11] = "contract.recipient";
        values[11] = _address2str(recipient);

        keys[12] = "legal.type";
        values[12] = "treasury_agreement";
    }

    // ─── Internal Helpers ─────────────────────────────────────────────────────

    function _uint2str(uint256 _i) internal pure returns (string memory str) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 length;
        while (j != 0) {
            length++;
            j /= 10;
        }
        bytes memory bstr = new bytes(length);
        uint256 k = length;
        j = _i;
        while (j != 0) {
            bstr[--k] = bytes1(uint8(48 + j % 10));
            j /= 10;
        }
        str = string(bstr);
    }

    function _address2str(address _addr) internal pure returns (string memory) {
        bytes32 value = bytes32(uint256(uint160(_addr)));
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(42);
        str[0] = '0';
        str[1] = 'x';
        for (uint256 i = 0; i < 20; i++) {
            str[2+i*2] = alphabet[uint8(value[i + 12] >> 4)];
            str[3+i*2] = alphabet[uint8(value[i + 12] & 0x0f)];
        }
        return string(str);
    }
}
