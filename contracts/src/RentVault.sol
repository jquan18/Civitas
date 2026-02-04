// SPDX-License-Identifier: MIT
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
}
