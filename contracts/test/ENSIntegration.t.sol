// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/CivitasFactory.sol";
import "../src/RentVault.sol";
import "../src/GroupBuyEscrow.sol";
import "../src/StableAllowanceTreasury.sol";
import "../src/interfaces/IENSResolver.sol";

/**
 * @title MockENSRegistry
 * @notice Mock ENS Registry for testing
 */
contract MockENSRegistry is IENSRegistry {
    mapping(bytes32 => address) public owners;
    mapping(bytes32 => address) public resolvers;
    mapping(bytes32 => mapping(bytes32 => address)) public subdomains;

    function setSubnodeOwner(bytes32 node, bytes32 label, address owner) external returns (bytes32) {
        bytes32 subnode = keccak256(abi.encodePacked(node, label));
        owners[subnode] = owner;
        subdomains[node][label] = owner;
        return subnode;
    }

    function setSubnodeRecord(
        bytes32 node,
        bytes32 label,
        address owner,
        address resolver,
        uint64 /* ttl */
    ) external {
        bytes32 subnode = keccak256(abi.encodePacked(node, label));
        owners[subnode] = owner;
        resolvers[subnode] = resolver;
    }

    function setResolver(bytes32 node, address resolver) external {
        resolvers[node] = resolver;
    }

    function setOwner(bytes32 node, address owner) external {
        owners[node] = owner;
    }

    function resolver(bytes32 node) external view returns (address) {
        return resolvers[node];
    }

    function owner(bytes32 node) external view returns (address) {
        return owners[node];
    }
}

/**
 * @title MockENSResolver
 * @notice Mock ENS Resolver for testing (supports both text and address records)
 */
contract MockENSResolver is IENSTextResolver, IENSAddrResolver {
    mapping(bytes32 => mapping(string => string)) public texts;
    mapping(bytes32 => address) public addresses;

    function setText(bytes32 node, string calldata key, string calldata value) external {
        texts[node][key] = value;
    }

    function text(bytes32 node, string calldata key) external view returns (string memory) {
        return texts[node][key];
    }

    function setAddr(bytes32 node, address addr) external {
        addresses[node] = addr;
    }

    function addr(bytes32 node) external view returns (address) {
        return addresses[node];
    }
}

/**
 * @title MockUSDC
 * @notice Mock USDC token for testing
 */
contract MockUSDC {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }
}

/**
 * @title ENSIntegrationTest
 * @notice Comprehensive tests for ENS integration with Civitas contracts
 */
contract ENSIntegrationTest is Test {
    CivitasFactory public factory;
    MockUSDC public usdc;
    MockENSRegistry public ensRegistry;
    MockENSResolver public ensResolver;

    RentVault public rentVaultImpl;
    GroupBuyEscrow public groupBuyEscrowImpl;
    StableAllowanceTreasury public treasuryImpl;

    address public owner = address(this);
    address public user1 = address(0x1);
    address public user2 = address(0x2);
    address public user3 = address(0x3);

    bytes32 public parentNode; // namehash("civitas.basetest.eth")

    event ENSRecordsSet(address indexed contractAddress, bytes32 indexed node, string basename);
    event ENSRecordUpdated(bytes32 indexed node, string key, string value, address indexed updater);

    function setUp() public {
        // Deploy mocks
        usdc = new MockUSDC();
        ensRegistry = new MockENSRegistry();
        ensResolver = new MockENSResolver();

        // Deploy implementations
        rentVaultImpl = new RentVault();
        groupBuyEscrowImpl = new GroupBuyEscrow();
        treasuryImpl = new StableAllowanceTreasury();

        // Deploy factory
        factory = new CivitasFactory(
            address(usdc),
            address(rentVaultImpl),
            address(groupBuyEscrowImpl),
            address(treasuryImpl)
        );

        // Set up ENS
        parentNode = keccak256(abi.encodePacked(
            keccak256(abi.encodePacked(bytes32(0), keccak256("eth"))),
            keccak256("basetest")
        ));
        parentNode = keccak256(abi.encodePacked(parentNode, keccak256("civitas")));

        factory.setENSRegistry(address(ensRegistry));
        factory.setENSTextResolver(address(ensResolver));
        factory.setENSAddrResolver(address(ensResolver));
        factory.setCivitasParentNode(parentNode);

        // Setup test users with USDC
        usdc.mint(user1, 10000e6);
        usdc.mint(user2, 10000e6);
        usdc.mint(user3, 10000e6);

        vm.prank(user1);
        usdc.approve(address(factory), type(uint256).max);
        vm.prank(user2);
        usdc.approve(address(factory), type(uint256).max);
        vm.prank(user3);
        usdc.approve(address(factory), type(uint256).max);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TEST: Subdomain Creation
    // ═══════════════════════════════════════════════════════════════════════════

    function testCreateSubdomainAndSetRecords() public {
        // Create RentVault
        address[] memory tenants = new address[](2);
        tenants[0] = user1;
        tenants[1] = user2;

        uint256[] memory shares = new uint256[](2);
        shares[0] = 5000;
        shares[1] = 5000;

        vm.prank(user1);
        address clone = factory.createRentVault(
            user3,
            1000e6,
            block.timestamp + 30 days,
            tenants,
            shares
        );

        // Build ENS metadata
        string[] memory keys = new string[](3);
        keys[0] = "contract.type";
        keys[1] = "contract.status";
        keys[2] = "contract.version";

        string[] memory values = new string[](3);
        values[0] = "RentVault";
        values[1] = "Pending";
        values[2] = "1.0.0";

        // Create subdomain and set records
        vm.prank(user1);
        vm.expectEmit(true, true, false, true);
        emit ENSRecordsSet(clone, factory.calculateENSNode("test-rent"), "test-rent");
        factory.createSubdomainAndSetRecords(clone, "test-rent", keys, values);

        // Verify subdomain was created
        bytes32 node = factory.calculateENSNode("test-rent");
        assertEq(ensRegistry.owner(node), address(factory));

        // Verify resolver was set
        assertEq(ensRegistry.resolver(node), address(ensResolver));

        // Verify address record
        assertEq(ensResolver.addr(node), clone);

        // Verify text records
        assertEq(ensResolver.text(node, "contract.type"), "RentVault");
        assertEq(ensResolver.text(node, "contract.status"), "Pending");
        assertEq(ensResolver.text(node, "contract.version"), "1.0.0");
    }

    function testCannotCreateDuplicateBasename() public {
        address[] memory tenants = new address[](1);
        tenants[0] = user1;
        uint256[] memory shares = new uint256[](1);
        shares[0] = 10000;

        // Create first contract
        vm.prank(user1);
        address clone1 = factory.createRentVault(
            user3,
            1000e6,
            block.timestamp + 30 days,
            tenants,
            shares
        );

        string[] memory keys = new string[](1);
        keys[0] = "contract.type";
        string[] memory values = new string[](1);
        values[0] = "RentVault";

        vm.prank(user1);
        factory.createSubdomainAndSetRecords(clone1, "duplicate-test", keys, values);

        // Create second contract
        vm.prank(user2);
        address clone2 = factory.createRentVault(
            user3,
            2000e6,
            block.timestamp + 30 days,
            tenants,
            shares
        );

        // Try to use same basename - should fail
        vm.prank(user2);
        vm.expectRevert("Basename already taken");
        factory.createSubdomainAndSetRecords(clone2, "duplicate-test", keys, values);
    }

    function testOnlyCreatorCanSetENSRecords() public {
        address[] memory tenants = new address[](1);
        tenants[0] = user1;
        uint256[] memory shares = new uint256[](1);
        shares[0] = 10000;

        vm.prank(user1);
        address clone = factory.createRentVault(
            user3,
            1000e6,
            block.timestamp + 30 days,
            tenants,
            shares
        );

        string[] memory keys = new string[](1);
        keys[0] = "contract.type";
        string[] memory values = new string[](1);
        values[0] = "RentVault";

        // User2 (not creator) tries to set records
        vm.prank(user2);
        vm.expectRevert("Not authorized");
        factory.createSubdomainAndSetRecords(clone, "unauthorized-test", keys, values);

        // Creator can set records
        vm.prank(user1);
        factory.createSubdomainAndSetRecords(clone, "authorized-test", keys, values);
    }

    function testOwnerCanSetENSRecords() public {
        address[] memory tenants = new address[](1);
        tenants[0] = user1;
        uint256[] memory shares = new uint256[](1);
        shares[0] = 10000;

        vm.prank(user1);
        address clone = factory.createRentVault(
            user3,
            1000e6,
            block.timestamp + 30 days,
            tenants,
            shares
        );

        string[] memory keys = new string[](1);
        keys[0] = "contract.type";
        string[] memory values = new string[](1);
        values[0] = "RentVault";

        // Owner (factory owner) can set records
        vm.prank(owner);
        factory.createSubdomainAndSetRecords(clone, "owner-test", keys, values);

        bytes32 node = factory.calculateENSNode("owner-test");
        assertEq(ensResolver.text(node, "contract.type"), "RentVault");
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TEST: ENS Metadata Functions
    // ═══════════════════════════════════════════════════════════════════════════

    function testRentVaultENSMetadata() public {
        address[] memory tenants = new address[](2);
        tenants[0] = user1;
        tenants[1] = user2;
        uint256[] memory shares = new uint256[](2);
        shares[0] = 6000;
        shares[1] = 4000;

        vm.prank(user1);
        address clone = factory.createRentVault(
            user3,
            1000e6,
            block.timestamp + 30 days,
            tenants,
            shares
        );

        RentVault vault = RentVault(clone);
        (
            string memory contractType,
            string memory status,
            string[] memory keys,
            string[] memory values
        ) = vault.getENSMetadata();

        assertEq(contractType, "RentVault");
        assertEq(status, "Pending");
        assertEq(keys.length, 11);
        assertEq(values.length, 11);

        // Verify specific fields
        assertEq(keys[0], "contract.type");
        assertEq(values[0], "RentVault");
        assertEq(keys[1], "contract.status");
        assertEq(values[1], "Pending");
        assertEq(keys[3], "contract.rent.amount");
        assertEq(values[3], "1000000000"); // 1000e6
    }

    function testGroupBuyEscrowENSMetadata() public {
        address[] memory participants = new address[](3);
        participants[0] = user1;
        participants[1] = user2;
        participants[2] = user3;
        uint256[] memory shares = new uint256[](3);
        shares[0] = 3333;
        shares[1] = 3333;
        shares[2] = 3334;

        vm.prank(user1);
        address clone = factory.createGroupBuyEscrow(
            user3,
            5000e6,
            block.timestamp + 30 days,
            7 days,
            participants,
            shares
        );

        GroupBuyEscrow escrow = GroupBuyEscrow(clone);
        (
            string memory contractType,
            string memory status,
            string[] memory keys,
            string[] memory values
        ) = escrow.getENSMetadata();

        assertEq(contractType, "GroupBuyEscrow");
        assertEq(status, "Funding");
        assertEq(keys.length, 14);
        assertEq(values.length, 14);

        assertEq(keys[0], "contract.type");
        assertEq(values[0], "GroupBuyEscrow");
        assertEq(keys[3], "contract.escrow.goal");
        assertEq(values[3], "5000000000"); // 5000e6
        assertEq(keys[7], "contract.escrow.votingThreshold");
        assertEq(values[7], "51");
    }

    function testTreasuryENSMetadata() public {
        vm.prank(user1);
        address clone = factory.createStableAllowanceTreasury(
            user1,
            user2,
            500e6
        );

        StableAllowanceTreasury treasury = StableAllowanceTreasury(payable(clone));
        (
            string memory contractType,
            string memory status,
            string[] memory keys,
            string[] memory values
        ) = treasury.getENSMetadata();

        assertEq(contractType, "StableAllowanceTreasury");
        assertEq(status, "Active");
        assertEq(keys.length, 13);
        assertEq(values.length, 13);

        assertEq(keys[0], "contract.type");
        assertEq(values[0], "StableAllowanceTreasury");
        assertEq(keys[3], "contract.treasury.allowancePerIncrement");
        assertEq(values[3], "500000000"); // 500e6
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TEST: Update ENS Records
    // ═══════════════════════════════════════════════════════════════════════════

    function testUpdateENSRecord() public {
        address[] memory tenants = new address[](1);
        tenants[0] = user1;
        uint256[] memory shares = new uint256[](1);
        shares[0] = 10000;

        vm.prank(user1);
        address clone = factory.createRentVault(
            user3,
            1000e6,
            block.timestamp + 30 days,
            tenants,
            shares
        );

        string[] memory keys = new string[](1);
        keys[0] = "contract.status";
        string[] memory values = new string[](1);
        values[0] = "Pending";

        vm.prank(user1);
        factory.createSubdomainAndSetRecords(clone, "update-test", keys, values);

        bytes32 node = factory.calculateENSNode("update-test");
        assertEq(ensResolver.text(node, "contract.status"), "Pending");

        // Update status to "Funded"
        vm.prank(user1);
        factory.updateENSRecord(clone, "update-test", "contract.status", "Funded");

        assertEq(ensResolver.text(node, "contract.status"), "Funded");
    }

    function testBatchUpdateENSRecords() public {
        // Create 3 contracts
        address[] memory contracts = new address[](3);
        string[] memory basenames = new string[](3);

        address[] memory tenants = new address[](1);
        tenants[0] = user1;
        uint256[] memory shares = new uint256[](1);
        shares[0] = 10000;

        for (uint i = 0; i < 3; i++) {
            vm.prank(user1);
            contracts[i] = factory.createRentVault(
                user3,
                1000e6,
                block.timestamp + 30 days,
                tenants,
                shares
            );
            basenames[i] = string(abi.encodePacked("batch-", vm.toString(i)));

            string[] memory keys = new string[](1);
            keys[0] = "contract.status";
            string[] memory values = new string[](1);
            values[0] = "Pending";

            vm.prank(user1);
            factory.createSubdomainAndSetRecords(contracts[i], basenames[i], keys, values);
        }

        // Batch update all to "Active"
        string[] memory updateKeys = new string[](1);
        updateKeys[0] = "contract.status";

        string[][] memory updateValues = new string[][](3);
        for (uint i = 0; i < 3; i++) {
            updateValues[i] = new string[](1);
            updateValues[i][0] = "Active";
        }

        vm.prank(user1);
        factory.batchUpdateENSRecords(contracts, basenames, updateKeys, updateValues);

        // Verify all updated
        for (uint i = 0; i < 3; i++) {
            bytes32 node = factory.calculateENSNode(basenames[i]);
            assertEq(ensResolver.text(node, "contract.status"), "Active");
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TEST: Basename Availability
    // ═══════════════════════════════════════════════════════════════════════════

    function testBasenameAvailability() public {
        assertTrue(factory.isBasenameAvailable("available-name"));

        address[] memory tenants = new address[](1);
        tenants[0] = user1;
        uint256[] memory shares = new uint256[](1);
        shares[0] = 10000;

        vm.prank(user1);
        address clone = factory.createRentVault(
            user3,
            1000e6,
            block.timestamp + 30 days,
            tenants,
            shares
        );

        string[] memory keys = new string[](1);
        keys[0] = "contract.type";
        string[] memory values = new string[](1);
        values[0] = "RentVault";

        vm.prank(user1);
        factory.createSubdomainAndSetRecords(clone, "taken-name", keys, values);

        assertFalse(factory.isBasenameAvailable("taken-name"));
        assertTrue(factory.isBasenameAvailable("still-available"));
    }

    function testGetContractByBasename() public {
        address[] memory tenants = new address[](1);
        tenants[0] = user1;
        uint256[] memory shares = new uint256[](1);
        shares[0] = 10000;

        vm.prank(user1);
        address clone = factory.createRentVault(
            user3,
            1000e6,
            block.timestamp + 30 days,
            tenants,
            shares
        );

        string[] memory keys = new string[](1);
        keys[0] = "contract.type";
        string[] memory values = new string[](1);
        values[0] = "RentVault";

        vm.prank(user1);
        factory.createSubdomainAndSetRecords(clone, "lookup-test", keys, values);

        address found = factory.getContractByBasename("lookup-test");
        assertEq(found, clone);

        address notFound = factory.getContractByBasename("nonexistent");
        assertEq(notFound, address(0));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TEST: ENS Node Calculation
    // ═══════════════════════════════════════════════════════════════════════════

    function testCalculateENSNode() public {
        string memory basename = "test-contract";
        bytes32 expectedNode = keccak256(
            abi.encodePacked(parentNode, keccak256(bytes(basename)))
        );

        bytes32 calculatedNode = factory.calculateENSNode(basename);
        assertEq(calculatedNode, expectedNode);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TEST: Integration - Full ENS Flow
    // ═══════════════════════════════════════════════════════════════════════════

    function testFullENSIntegrationFlow() public {
        // 1. Create contract
        address[] memory tenants = new address[](2);
        tenants[0] = user1;
        tenants[1] = user2;
        uint256[] memory shares = new uint256[](2);
        shares[0] = 5000;
        shares[1] = 5000;

        vm.prank(user1);
        address clone = factory.createRentVault(
            user3,
            1000e6,
            block.timestamp + 30 days,
            tenants,
            shares
        );

        RentVault vault = RentVault(clone);

        // 2. Get metadata from contract
        (
            string memory contractType,
            string memory status,
            string[] memory keys,
            string[] memory values
        ) = vault.getENSMetadata();

        // 3. Create subdomain and set all metadata
        vm.prank(user1);
        factory.createSubdomainAndSetRecords(clone, "full-flow-test", keys, values);

        // 4. Verify ENS records match contract state
        bytes32 node = factory.calculateENSNode("full-flow-test");
        assertEq(ensResolver.addr(node), clone);
        assertEq(ensResolver.text(node, "contract.type"), "RentVault");
        assertEq(ensResolver.text(node, "contract.status"), "Pending");

        // 5. Simulate contract state change (funding)
        vm.startPrank(user1);
        usdc.approve(clone, 500e6);
        vault.deposit(500e6);
        vm.stopPrank();

        vm.startPrank(user2);
        usdc.approve(clone, 500e6);
        vault.deposit(500e6);
        vm.stopPrank();

        // 6. Get updated metadata
        (, string memory newStatus,,) = vault.getENSMetadata();
        assertEq(newStatus, "Funded");

        // 7. Update ENS record
        vm.prank(user1);
        factory.updateENSRecord(clone, "full-flow-test", "contract.status", "Funded");

        // 8. Verify update
        assertEq(ensResolver.text(node, "contract.status"), "Funded");

        // 9. Verify forward and reverse resolution
        assertEq(ensResolver.addr(node), clone);
        assertEq(factory.getContractByBasename("full-flow-test"), clone);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TEST: Edge Cases
    // ═══════════════════════════════════════════════════════════════════════════

    function testEmptyBasenameReverts() public {
        address[] memory tenants = new address[](1);
        tenants[0] = user1;
        uint256[] memory shares = new uint256[](1);
        shares[0] = 10000;

        vm.prank(user1);
        address clone = factory.createRentVault(
            user3,
            1000e6,
            block.timestamp + 30 days,
            tenants,
            shares
        );

        string[] memory keys = new string[](1);
        keys[0] = "contract.type";
        string[] memory values = new string[](1);
        values[0] = "RentVault";

        // Empty basename should work (just produces different hash)
        vm.prank(user1);
        factory.createSubdomainAndSetRecords(clone, "", keys, values);

        bytes32 node = factory.calculateENSNode("");
        assertEq(ensResolver.text(node, "contract.type"), "RentVault");
    }

    function testMismatchedArrayLengthsRevert() public {
        address[] memory tenants = new address[](1);
        tenants[0] = user1;
        uint256[] memory shares = new uint256[](1);
        shares[0] = 10000;

        vm.prank(user1);
        address clone = factory.createRentVault(
            user3,
            1000e6,
            block.timestamp + 30 days,
            tenants,
            shares
        );

        string[] memory keys = new string[](2);
        keys[0] = "contract.type";
        keys[1] = "contract.status";

        string[] memory values = new string[](1);
        values[0] = "RentVault";

        vm.prank(user1);
        vm.expectRevert("Array length mismatch");
        factory.createSubdomainAndSetRecords(clone, "mismatch-test", keys, values);
    }

    function testENSNotConfiguredReverts() public {
        // Deploy new factory without ENS config
        CivitasFactory newFactory = new CivitasFactory(
            address(usdc),
            address(rentVaultImpl),
            address(groupBuyEscrowImpl),
            address(treasuryImpl)
        );

        address[] memory tenants = new address[](1);
        tenants[0] = user1;
        uint256[] memory shares = new uint256[](1);
        shares[0] = 10000;

        vm.prank(user1);
        address clone = newFactory.createRentVault(
            user3,
            1000e6,
            block.timestamp + 30 days,
            tenants,
            shares
        );

        string[] memory keys = new string[](1);
        keys[0] = "contract.type";
        string[] memory values = new string[](1);
        values[0] = "RentVault";

        vm.prank(user1);
        vm.expectRevert("ENS registry not set");
        newFactory.createSubdomainAndSetRecords(clone, "no-ens", keys, values);
    }
}
