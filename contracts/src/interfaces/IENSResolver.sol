// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IENSTextResolver
 * @notice Interface for ENS resolvers that support text records
 * @dev Used to store contract metadata in ENS as key-value pairs
 */
interface IENSTextResolver {
    /**
     * @notice Sets the text data associated with an ENS node and key
     * @param node The ENS node to update (namehash of the name)
     * @param key The key to set (e.g., "contract.type", "contract.status")
     * @param value The text data value
     */
    function setText(bytes32 node, string calldata key, string calldata value) external;

    /**
     * @notice Returns the text data associated with an ENS node and key
     * @param node The ENS node to query
     * @param key The key to query
     * @return The text data value
     */
    function text(bytes32 node, string calldata key) external view returns (string memory);
}

/**
 * @title IENSReverseRegistrar
 * @notice Interface for the ENS Reverse Registrar
 * @dev Used to set reverse records (address -> name mapping)
 */
interface IENSReverseRegistrar {
    /**
     * @notice Sets the name for the caller's address
     * @param name The name to set as the reverse record
     * @return The ENS node hash of the reverse record
     */
    function setName(string memory name) external returns (bytes32);

    /**
     * @notice Sets the name for a specified address
     * @param addr The address to set the reverse record for
     * @param owner The owner of the reverse record
     * @param resolver The resolver to use
     * @param name The name to set
     * @return The ENS node hash of the reverse record
     */
    function setNameForAddr(
        address addr,
        address owner,
        address resolver,
        string memory name
    ) external returns (bytes32);

    /**
     * @notice Returns the ENS node hash for an address
     * @param addr The address to get the node for
     * @return The ENS node hash
     */
    function node(address addr) external pure returns (bytes32);
}

/**
 * @title IENSRegistry
 * @notice Interface for the ENS Registry
 * @dev Used to manage ENS name ownership and resolvers
 */
interface IENSRegistry {
    /**
     * @notice Returns the address of the resolver for the specified node
     * @param node The specified node
     * @return The address of the resolver
     */
    function resolver(bytes32 node) external view returns (address);

    /**
     * @notice Returns the address that owns the specified node
     * @param node The specified node
     * @return The address of the owner
     */
    function owner(bytes32 node) external view returns (address);

    /**
     * @notice Sets the resolver address for the specified node
     * @param node The node to update
     * @param resolverAddress The address of the resolver
     */
    function setResolver(bytes32 node, address resolverAddress) external;

    /**
     * @notice Transfers ownership of a node to a new address
     * @param node The node to transfer ownership of
     * @param ownerAddress The address of the new owner
     */
    function setOwner(bytes32 node, address ownerAddress) external;

    /**
     * @notice Creates a subdomain and sets its owner
     * @param node The parent node
     * @param label The label hash of the subdomain
     * @param ownerAddress The address of the subdomain owner
     */
    function setSubnodeOwner(bytes32 node, bytes32 label, address ownerAddress) external returns (bytes32);

    /**
     * @notice Creates a subdomain with a record
     * @param node The parent node
     * @param label The label hash of the subdomain
     * @param ownerAddress The address of the subdomain owner
     * @param resolverAddress The resolver address
     * @param ttl The TTL value
     */
    function setSubnodeRecord(
        bytes32 node,
        bytes32 label,
        address ownerAddress,
        address resolverAddress,
        uint64 ttl
    ) external;
}

/**
 * @title IENSAddrResolver
 * @notice Interface for ENS resolvers that support address records
 * @dev Used to set forward resolution (name -> address)
 */
interface IENSAddrResolver {
    /**
     * @notice Sets the address associated with an ENS node
     * @param node The ENS node to update
     * @param addr The address to set
     */
    function setAddr(bytes32 node, address addr) external;

    /**
     * @notice Returns the address associated with an ENS node
     * @param node The ENS node to query
     * @return The address
     */
    function addr(bytes32 node) external view returns (address);
}
