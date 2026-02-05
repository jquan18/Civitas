// Map template IDs to their Solidity source code
export const CONTRACT_SOURCES: Record<string, string> = {
    'rent-vault': `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title RentVault
 * @notice Multi-Tenant Rent Vault (Single Use) - Initializable clone version
 * @dev Tenants deposit their share of rent; landlord can withdraw once fully funded.
 *      Landlord can refund all deposits if a tenant refuses to pay.
 */
contract RentVault is Initializable {
    // State
    IERC20 public USDC;
    address public recipient;
    uint256 public rentAmount;
    uint256 public dueDate;

    uint256 public totalDeposited;
    bool public withdrawn;

    mapping(address => uint256) public tenantBalances;
    mapping(address => uint256) public shareBps;
    mapping(address => bool) public isTenant;

    // Events
    event Deposited(address indexed tenant, uint256 amount, uint256 totalDeposited);
    event RentFullyFunded(uint256 totalDeposited);
    event WithdrawnToLandlord(address indexed landlord, uint256 amount);
    event Refunded(address indexed tenant, uint256 amount);

    // Modifiers
    modifier onlyRecipient() {
        require(msg.sender == recipient, "Only recipient");
        _;
    }

    modifier onlyTenant() {
        require(isTenant[msg.sender], "Only tenant");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _usdcAddress,
        address _recipient,
        uint256 _rentAmount,
        uint256 _dueDate,
        address[] calldata _tenants,
        uint256[] calldata _shareBps
    ) external initializer {
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

    // Core Actions
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

    // Views
    function tenantMaxContribution(address tenant) external view returns (uint256) {
        if (!isTenant[tenant]) return 0;
        return (rentAmount * shareBps[tenant] + 9999) / 10000;
    }

    function isRecipient(address account) external view returns (bool) {
        return account == recipient;
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
        contractType = "RentVault";

        // Determine status
        if (withdrawn) {
            status = "Completed";
        } else if (totalDeposited == rentAmount) {
            status = "Funded";
        } else if (block.timestamp > dueDate) {
            status = "Expired";
        } else {
            status = "Pending";
        }

        // Build metadata arrays (11 fields)
        keys = new string[](11);
        values = new string[](11);

        keys[0] = "contract.type";
        values[0] = "RentVault";

        keys[1] = "contract.status";
        values[1] = status;

        keys[2] = "contract.version";
        values[2] = "1.0.0";

        keys[3] = "contract.rent.amount";
        values[3] = _uint2str(rentAmount);

        keys[4] = "contract.rent.dueDate";
        values[4] = _uint2str(dueDate);

        keys[5] = "contract.rent.totalDeposited";
        values[5] = _uint2str(totalDeposited);

        keys[6] = "contract.rent.withdrawn";
        values[6] = withdrawn ? "true" : "false";

        keys[7] = "contract.rent.currency";
        values[7] = "USDC";

        keys[8] = "contract.rent.currencyAddress";
        values[8] = _address2str(address(USDC));

        keys[9] = "contract.recipient";
        values[9] = _address2str(recipient);

        keys[10] = "legal.type";
        values[10] = "rental_agreement";
    }

    /**
     * @notice Get all tenant addresses
     * @dev Helper function to build participant list for ENS
     * @return Array of tenant addresses (caller must filter by isTenant mapping)
     */
    function getTenantAddresses() external view returns (address[] memory) {
        // Note: Since we don't store an array of tenants, the backend should
        // call this via events or maintain its own list
        // This is a placeholder - backend should track tenants from initialization
        address[] memory empty;
        return empty;
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
}`,

    'group-buy-escrow': `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title GroupBuyEscrow
 * @notice Group Buy Escrow (Lead-Majority Model) - Initializable clone version
 * @dev Participants deposit USDC toward a funding goal.
 *      - If goal not met by expiry, each participant can refund.
 *      - If goal met, purchaser confirms delivery with proof hash.
 *      - Majority (>50%) of participants vote to release funds to purchaser.
 *      - If delivery not confirmed within timelock after goal, participants can refund.
 */
contract GroupBuyEscrow is Initializable {
    // State
    IERC20 public USDC;
    address public recipient;
    uint256 public fundingGoal;
    uint256 public expiryDate;
    uint256 public timelockRefundDelay;

    uint256 public totalDeposited;
    uint256 public goalReachedAt;
    uint256 public deliveryConfirmedAt;
    string public deliveryProof;
    bool public released;

    uint256 public yesVotes;
    uint256 public participantCount;

    mapping(address => uint256) public deposits;
    mapping(address => bool) public isParticipant;
    mapping(address => bool) public hasVoted;
    mapping(address => uint256) public shareBps;

    // Events
    event Deposited(address indexed participant, uint256 amount, uint256 totalDeposited);
    event GoalReached(uint256 totalDeposited, uint256 timestamp);
    event Refunded(address indexed participant, uint256 amount);
    event DeliveryConfirmed(address indexed recipient, string proof, uint256 timestamp);
    event VoteCast(address indexed participant, uint256 yesVotes);
    event FundsReleased(address indexed purchaser, uint256 amount);
    event TimelockRefund(address indexed participant, uint256 amount);

    // Modifiers
    modifier onlyParticipant() {
        require(isParticipant[msg.sender], "Not a participant");
        _;
    }

    modifier onlyRecipient() {
        require(msg.sender == recipient, "Only recipient");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _usdcAddress,
        address _recipient,
        uint256 _fundingGoal,
        uint256 _expiryDate,
        uint256 _timelockRefundDelay,
        address[] calldata _participants,
        uint256[] calldata _shareBps
    ) external initializer {
        require(_usdcAddress != address(0), "Invalid USDC address");
        require(_recipient != address(0), "Invalid recipient");
        require(_fundingGoal > 0, "Invalid funding goal");
        require(_expiryDate > block.timestamp, "Invalid expiry");
        require(_participants.length > 0, "No participants");
        require(_participants.length == _shareBps.length, "Array length mismatch");

        uint256 totalBps = 0;
        for (uint256 i = 0; i < _participants.length; i++) {
            address participant = _participants[i];
            uint256 bps = _shareBps[i];
            require(participant != address(0), "Invalid participant");
            require(bps > 0, "Invalid share bps");
            require(!isParticipant[participant], "Duplicate participant");
            isParticipant[participant] = true;
            shareBps[participant] = bps;
            totalBps += bps;
        }
        require(totalBps == 10000, "Shares must equal 10000 bps");

        USDC = IERC20(_usdcAddress);
        recipient = _recipient;
        fundingGoal = _fundingGoal;
        expiryDate = _expiryDate;
        timelockRefundDelay = _timelockRefundDelay;
        participantCount = _participants.length;
    }

    // Core Actions
    function deposit(uint256 amount) external onlyParticipant {
        require(amount > 0, "Amount must be > 0");
        require(block.timestamp <= expiryDate, "Funding expired");
        require(totalDeposited < fundingGoal, "Funding goal reached");

        uint256 maxContribution = (fundingGoal * shareBps[msg.sender] + 9999) / 10000;
        require(deposits[msg.sender] + amount <= maxContribution, "Exceeds participant share");
        require(totalDeposited + amount <= fundingGoal, "Exceeds funding goal");

        deposits[msg.sender] += amount;
        totalDeposited += amount;

        require(USDC.transferFrom(msg.sender, address(this), amount), "USDC transfer failed");

        if (totalDeposited == fundingGoal && goalReachedAt == 0) {
            goalReachedAt = block.timestamp;
            emit GoalReached(totalDeposited, block.timestamp);
        }

        emit Deposited(msg.sender, amount, totalDeposited);
    }

    function refund() external onlyParticipant {
        require(block.timestamp > expiryDate, "Funding not expired");
        require(totalDeposited < fundingGoal, "Funding goal met");
        uint256 amount = deposits[msg.sender];
        require(amount > 0, "Nothing to refund");

        deposits[msg.sender] = 0;
        totalDeposited -= amount;
        require(USDC.transfer(msg.sender, amount), "USDC transfer failed");

        emit Refunded(msg.sender, amount);
    }

    function confirmDelivery(string calldata proof) external onlyRecipient {
        require(goalReachedAt > 0, "Funding goal not met");
        require(deliveryConfirmedAt == 0, "Delivery already confirmed");

        deliveryConfirmedAt = block.timestamp;
        deliveryProof = proof;

        emit DeliveryConfirmed(msg.sender, proof, block.timestamp);
    }

    function voteRelease() external onlyParticipant {
        require(deliveryConfirmedAt > 0, "Delivery not confirmed");
        require(!hasVoted[msg.sender], "Already voted");

        hasVoted[msg.sender] = true;
        yesVotes += 1;

        emit VoteCast(msg.sender, yesVotes);
    }

    function releaseFunds() external {
        require(deliveryConfirmedAt > 0, "Delivery not confirmed");
        require(!released, "Already released");
        require(yesVotes * 2 > participantCount, "Majority not reached");

        released = true;
        uint256 balance = USDC.balanceOf(address(this));
        require(USDC.transfer(recipient, balance), "USDC transfer failed");

        emit FundsReleased(recipient, balance);
    }

    function timelockRefund() external onlyParticipant {
        require(goalReachedAt > 0, "Funding goal not met");
        require(deliveryConfirmedAt == 0, "Delivery already confirmed");
        require(block.timestamp > goalReachedAt + timelockRefundDelay, "Timelock not reached");

        uint256 amount = deposits[msg.sender];
        require(amount > 0, "Nothing to refund");

        deposits[msg.sender] = 0;
        totalDeposited -= amount;
        require(USDC.transfer(msg.sender, amount), "USDC transfer failed");

        emit TimelockRefund(msg.sender, amount);
    }

    // Views
    function needsMajority() external view returns (uint256) {
        return participantCount / 2 + 1;
    }

    function participantMaxContribution(address participant) external view returns (uint256) {
        if (!isParticipant[participant]) return 0;
        return (fundingGoal * shareBps[participant] + 9999) / 10000;
    }

    function isRecipientAddress(address account) external view returns (bool) {
        return account == recipient;
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
        contractType = "GroupBuyEscrow";

        // Determine status
        if (released) {
            status = "Completed";
        } else if (goalReachedAt > 0 && deliveryConfirmedAt > 0) {
            status = "AwaitingVotes";
        } else if (goalReachedAt > 0) {
            status = "AwaitingDelivery";
        } else if (block.timestamp > expiryDate && totalDeposited < fundingGoal) {
            status = "Expired";
        } else if (totalDeposited == fundingGoal) {
            status = "Funded";
        } else {
            status = "Funding";
        }

        // Build metadata arrays (14 fields)
        keys = new string[](14);
        values = new string[](14);

        keys[0] = "contract.type";
        values[0] = "GroupBuyEscrow";

        keys[1] = "contract.status";
        values[1] = status;

        keys[2] = "contract.version";
        values[2] = "1.0.0";

        keys[3] = "contract.escrow.goal";
        values[3] = _uint2str(fundingGoal);

        keys[4] = "contract.escrow.totalDeposited";
        values[4] = _uint2str(totalDeposited);

        keys[5] = "contract.escrow.expiry";
        values[5] = _uint2str(expiryDate);

        keys[6] = "contract.escrow.participantCount";
        values[6] = _uint2str(participantCount);

        keys[7] = "contract.escrow.votingThreshold";
        values[7] = "51";

        keys[8] = "contract.escrow.yesVotes";
        values[8] = _uint2str(yesVotes);

        keys[9] = "contract.escrow.released";
        values[9] = released ? "true" : "false";

        keys[10] = "contract.escrow.currency";
        values[10] = "USDC";

        keys[11] = "contract.escrow.currencyAddress";
        values[11] = _address2str(address(USDC));

        keys[12] = "contract.recipient";
        values[12] = _address2str(recipient);

        keys[13] = "legal.type";
        values[13] = "escrow_agreement";
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
}`,

    'stable-allowance-treasury': `// SPDX-License-Identifier: MIT
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
}`
};

// Helper to get source code for a template
export function getContractSource(templateId: string): string {
    return CONTRACT_SOURCES[templateId] || '// Source code not available';
}
