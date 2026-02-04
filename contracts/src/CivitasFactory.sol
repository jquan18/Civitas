// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./RentVault.sol";
import "./GroupBuyEscrow.sol";
import "./StableAllowanceTreasury.sol";
import "./interfaces/IENSResolver.sol";

/**
 * @title CivitasFactory
 * @notice Unified factory for deploying all Civitas contract templates via EIP-1167 clones
 * @dev Now includes ENS integration for public contract registry
 */
contract CivitasFactory is Ownable {
    using Clones for address;

    IERC20 public immutable usdc;

    address public rentVaultImpl;
    address public groupBuyEscrowImpl;
    address public stableAllowanceTreasuryImpl;

    // ENS Integration
    IENSRegistry public ensRegistry;
    IENSTextResolver public ensTextResolver;
    IENSAddrResolver public ensAddrResolver;
    IENSReverseRegistrar public reverseRegistrar;
    bytes32 public civitasParentNode;  // namehash("civitas.basetest.eth")

    // Mapping to track contract creators for ENS permissions
    mapping(address => address) public contractCreators;

    // Mapping to track basename -> contract address
    mapping(string => address) public basenameToContract;

    // Events
    event RentVaultCreated(address indexed creator, address indexed clone, address indexed recipient);
    event GroupBuyEscrowCreated(address indexed creator, address indexed clone, address indexed recipient);
    event TreasuryCreated(address indexed creator, address indexed clone, address indexed owner_);
    event ENSRecordsSet(address indexed contractAddress, bytes32 indexed node, string basename);
    event ENSRecordUpdated(bytes32 indexed node, string key, string value, address indexed updater);

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

        contractCreators[clone] = msg.sender;
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

        contractCreators[clone] = msg.sender;
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

        contractCreators[clone] = msg.sender;
        emit TreasuryCreated(msg.sender, clone, _owner);
    }

    // ─── ENS Functions ────────────────────────────────────────────────────────

    /**
     * @notice Creates subdomain and sets all ENS records for a deployed contract
     * @dev Only callable by the contract creator or owner. This is the main function to use.
     * @dev Automatically appends contract address hash to prevent collisions
     * @param contractAddress The address of the deployed contract
     * @param basename The base name (e.g., "downtown-studio")
     * @param keys Array of text record keys
     * @param values Array of text record values (must match keys length)
     * @return fullBasename The complete basename with hash (e.g., "downtown-studio-a3f9e2c1")
     */
    function createSubdomainAndSetRecords(
        address contractAddress,
        string calldata basename,
        string[] calldata keys,
        string[] calldata values
    ) external returns (string memory fullBasename) {
        require(
            msg.sender == contractCreators[contractAddress] || msg.sender == owner(),
            "Not authorized"
        );
        require(keys.length == values.length, "Array length mismatch");
        require(address(ensRegistry) != address(0), "ENS registry not set");
        require(address(ensTextResolver) != address(0), "ENS text resolver not set");
        require(address(ensAddrResolver) != address(0), "ENS addr resolver not set");

        // Generate unique basename: {basename}-{first8CharsOfAddress}
        fullBasename = _generateUniqueBasename(basename, contractAddress);
        require(basenameToContract[fullBasename] == address(0), "Basename already taken");

        // Calculate the subdomain label and node
        bytes32 labelHash = keccak256(bytes(fullBasename));
        bytes32 node = keccak256(abi.encodePacked(civitasParentNode, labelHash));

        // 1. Create the subdomain (e.g., "downtown-studio.civitas.basetest.eth")
        ensRegistry.setSubnodeOwner(
            civitasParentNode,  // parent: civitas.basetest.eth
            labelHash,          // label: keccak256("downtown-studio")
            address(this)       // owner: factory contract
        );

        // 2. Set the resolver for this subdomain
        ensRegistry.setResolver(node, address(ensAddrResolver));

        // 3. Set the address record (forward resolution: name -> address)
        ensAddrResolver.setAddr(node, contractAddress);

        // 4. Set all text records (metadata)
        for (uint256 i = 0; i < keys.length; i++) {
            ensTextResolver.setText(node, keys[i], values[i]);
            emit ENSRecordUpdated(node, keys[i], values[i], msg.sender);
        }

        // Track the basename
        basenameToContract[fullBasename] = contractAddress;

        emit ENSRecordsSet(contractAddress, node, fullBasename);
    }

    /**
     * @notice Sets ENS text records for an existing subdomain
     * @dev Use this to update records after subdomain is created
     * @param contractAddress The address of the deployed contract
     * @param basename The basename (e.g., "contract-123" for "contract-123.civitas.basetest.eth")
     * @param keys Array of text record keys
     * @param values Array of text record values (must match keys length)
     */
    function setContractENSRecords(
        address contractAddress,
        string calldata basename,
        string[] calldata keys,
        string[] calldata values
    ) external {
        require(
            msg.sender == contractCreators[contractAddress] || msg.sender == owner(),
            "Not authorized"
        );
        require(keys.length == values.length, "Array length mismatch");
        require(address(ensTextResolver) != address(0), "ENS resolver not set");

        // Calculate the ENS node for this basename
        bytes32 subnodeHash = keccak256(bytes(basename));
        bytes32 node = keccak256(abi.encodePacked(civitasParentNode, subnodeHash));

        // Set all text records
        for (uint256 i = 0; i < keys.length; i++) {
            ensTextResolver.setText(node, keys[i], values[i]);
            emit ENSRecordUpdated(node, keys[i], values[i], msg.sender);
        }

        emit ENSRecordsSet(contractAddress, node, basename);
    }

    /**
     * @notice Updates a single ENS text record for a contract
     * @param contractAddress The address of the deployed contract
     * @param basename The basename of the contract
     * @param key The text record key to update
     * @param value The new value
     */
    function updateENSRecord(
        address contractAddress,
        string calldata basename,
        string calldata key,
        string calldata value
    ) external {
        require(
            msg.sender == contractCreators[contractAddress] || msg.sender == owner(),
            "Not authorized"
        );
        require(address(ensTextResolver) != address(0), "ENS resolver not set");

        bytes32 subnodeHash = keccak256(bytes(basename));
        bytes32 node = keccak256(abi.encodePacked(civitasParentNode, subnodeHash));

        ensTextResolver.setText(node, key, value);
        emit ENSRecordUpdated(node, key, value, msg.sender);
    }

    /**
     * @notice Batch update ENS records (useful for status changes)
     * @param contractAddresses Array of contract addresses
     * @param basenames Array of basenames
     * @param keys Array of keys to update (same for all contracts)
     * @param values Array of value arrays (one per contract)
     */
    function batchUpdateENSRecords(
        address[] calldata contractAddresses,
        string[] calldata basenames,
        string[] calldata keys,
        string[][] calldata values
    ) external {
        require(contractAddresses.length == basenames.length, "Length mismatch");
        require(contractAddresses.length == values.length, "Length mismatch");

        for (uint256 i = 0; i < contractAddresses.length; i++) {
            require(
                msg.sender == contractCreators[contractAddresses[i]] || msg.sender == owner(),
                "Not authorized"
            );
            require(keys.length == values[i].length, "Keys/values mismatch");

            bytes32 subnodeHash = keccak256(bytes(basenames[i]));
            bytes32 node = keccak256(abi.encodePacked(civitasParentNode, subnodeHash));

            for (uint256 j = 0; j < keys.length; j++) {
                ensTextResolver.setText(node, keys[j], values[i][j]);
                emit ENSRecordUpdated(node, keys[j], values[i][j], msg.sender);
            }
        }
    }

    /**
     * @notice Updates the forward address record for a subdomain
     * @dev Only callable by contract creator or owner
     * @param basename The basename of the contract
     * @param newAddress The new address to point to
     */
    function updateSubdomainAddress(
        string calldata basename,
        address newAddress
    ) external onlyOwner {
        require(address(ensAddrResolver) != address(0), "ENS addr resolver not set");

        bytes32 labelHash = keccak256(bytes(basename));
        bytes32 node = keccak256(abi.encodePacked(civitasParentNode, labelHash));

        ensAddrResolver.setAddr(node, newAddress);
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

    /**
     * @notice Sets the ENS registry address
     * @param _registry The ENS registry address (on Base Sepolia)
     */
    function setENSRegistry(address _registry) external onlyOwner {
        require(_registry != address(0), "Invalid registry");
        ensRegistry = IENSRegistry(_registry);
    }

    /**
     * @notice Sets the ENS text resolver address
     * @param _resolver The ENS text resolver address (on Base Sepolia)
     */
    function setENSTextResolver(address _resolver) external onlyOwner {
        require(_resolver != address(0), "Invalid resolver");
        ensTextResolver = IENSTextResolver(_resolver);
    }

    /**
     * @notice Sets the ENS address resolver address
     * @param _resolver The ENS address resolver address (on Base Sepolia)
     */
    function setENSAddrResolver(address _resolver) external onlyOwner {
        require(_resolver != address(0), "Invalid resolver");
        ensAddrResolver = IENSAddrResolver(_resolver);
    }

    /**
     * @notice Sets the ENS reverse registrar address
     * @param _reverseRegistrar The reverse registrar address (on Base L2)
     */
    function setReverseRegistrar(address _reverseRegistrar) external onlyOwner {
        require(_reverseRegistrar != address(0), "Invalid reverse registrar");
        reverseRegistrar = IENSReverseRegistrar(_reverseRegistrar);
    }

    /**
     * @notice Sets the parent node for Civitas subdomains
     * @param _parentNode The namehash of "civitas.basetest.eth"
     * @dev Can be calculated off-chain: namehash("civitas.basetest.eth")
     * @dev For mainnet, this would be namehash("civitas.base.eth")
     */
    function setCivitasParentNode(bytes32 _parentNode) external onlyOwner {
        civitasParentNode = _parentNode;
    }

    /**
     * @notice Check if a basename is available
     * @param basename The basename to check
     * @return True if available, false if already taken
     */
    function isBasenameAvailable(string calldata basename) external view returns (bool) {
        return basenameToContract[basename] == address(0);
    }

    /**
     * @notice Get the contract address for a given basename
     * @param basename The basename to query
     * @return The contract address, or address(0) if not set
     */
    function getContractByBasename(string calldata basename) external view returns (address) {
        return basenameToContract[basename];
    }

    // ─── View Functions ───────────────────────────────────────────────────────

    /**
     * @notice Returns the creator of a contract
     * @param contractAddress The contract address
     * @return The creator's address
     */
    function getContractCreator(address contractAddress) external view returns (address) {
        return contractCreators[contractAddress];
    }

    /**
     * @notice Calculates the ENS node for a given basename
     * @param basename The basename (without .civitas.basetest.eth)
     * @return The ENS node hash
     */
    function calculateENSNode(string calldata basename) external view returns (bytes32) {
        bytes32 subnodeHash = keccak256(bytes(basename));
        return keccak256(abi.encodePacked(civitasParentNode, subnodeHash));
    }

    /**
     * @notice Generates a unique basename by appending contract address hash
     * @param basename The user-provided base name
     * @param contractAddress The contract address to hash
     * @return The full basename with hash suffix
     * @dev Format: {basename}-{first8CharsOfAddress}
     * @dev Example: "downtown-studio" + 0xa3f9e2c1... → "downtown-studio-a3f9e2c1"
     */
    function generateUniqueBasename(
        string calldata basename,
        address contractAddress
    ) external pure returns (string memory) {
        return _generateUniqueBasename(basename, contractAddress);
    }

    // ─── Internal Helpers ─────────────────────────────────────────────────────

    /**
     * @dev Internal function to generate unique basename
     */
    function _generateUniqueBasename(
        string memory basename,
        address contractAddress
    ) internal pure returns (string memory) {
        // Get first 8 characters of contract address (after 0x)
        bytes memory addrBytes = abi.encodePacked(contractAddress);
        bytes memory hashSuffix = new bytes(8);
        bytes memory hexChars = "0123456789abcdef";

        for (uint i = 0; i < 4; i++) {
            hashSuffix[i * 2] = hexChars[uint8(addrBytes[i] >> 4)];
            hashSuffix[i * 2 + 1] = hexChars[uint8(addrBytes[i] & 0x0f)];
        }

        // Concatenate: basename + "-" + hash
        return string(abi.encodePacked(basename, "-", hashSuffix));
    }
}
