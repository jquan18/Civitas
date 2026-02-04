// SPDX-License-Identifier: MIT
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
}
