// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/CivitasFactory.sol";
import "../src/RentVault.sol";
import "../src/GroupBuyEscrow.sol";
import "../src/StableAllowanceTreasury.sol";

/**
 * @title DeployCivitasWithENS
 * @notice Deployment script for CivitasFactory with ENS integration on Base Sepolia
 * @dev Run with: forge script script/DeployCivitasWithENS.s.sol --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast --verify
 */
contract DeployCivitasWithENS is Script {
    // Base Sepolia addresses
    address constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

    // Base Sepolia ENS addresses (from github.com/base/basenames)
    address constant ENS_REGISTRY = 0x1493b2567056c2181630115660963E13A8E32735;
    address constant ENS_PUBLIC_RESOLVER = 0x6533C94869D28fAA8dF77cc63f9e2b2D6Cf77eBA;
    address constant ENS_REVERSE_REGISTRAR = 0x876eF94ce0773052a2f81921E70FF25a5e76841f;

    // Civitas parent node - namehash("civitas.basetest.eth")
    // Calculate with: npx tsx scripts/calculate-namehash.ts
    // REPLACE THIS WITH YOUR ACTUAL NAMEHASH
    bytes32 constant CIVITAS_PARENT_NODE = 0x1cbe20cfde3e946c37b02416f99842c64646625dd3d54f636c384d31c291523b;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("===================================================");
        console.log("  Deploying Civitas Factory with ENS Integration");
        console.log("===================================================");
        console.log("Deployer:", deployer);
        console.log("Network: Base Sepolia");
        console.log("USDC:", USDC);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy implementations
        console.log("1. Deploying template implementations...");
        RentVault rentVaultImpl = new RentVault();
        GroupBuyEscrow groupBuyEscrowImpl = new GroupBuyEscrow();
        StableAllowanceTreasury treasuryImpl = new StableAllowanceTreasury();

        console.log("   RentVault implementation:", address(rentVaultImpl));
        console.log("   GroupBuyEscrow implementation:", address(groupBuyEscrowImpl));
        console.log("   Treasury implementation:", address(treasuryImpl));
        console.log("");

        // 2. Deploy factory
        console.log("2. Deploying CivitasFactory...");
        CivitasFactory factory = new CivitasFactory(
            USDC,
            address(rentVaultImpl),
            address(groupBuyEscrowImpl),
            address(treasuryImpl)
        );
        console.log("   Factory deployed:", address(factory));
        console.log("");

        // 3. Configure ENS
        console.log("3. Configuring ENS integration...");

        if (CIVITAS_PARENT_NODE == bytes32(0)) {
            console.log("   WARNING: CIVITAS_PARENT_NODE is not set!");
            console.log("   Run: npx tsx scripts/calculate-namehash.ts");
            console.log("   Then update this script with the correct value");
            console.log("");
            console.log("   Skipping ENS configuration...");
        } else {
            factory.setENSRegistry(ENS_REGISTRY);
            console.log("   [OK]ENS Registry set:", ENS_REGISTRY);

            factory.setENSTextResolver(ENS_PUBLIC_RESOLVER);
            console.log("   [OK]ENS Text Resolver set:", ENS_PUBLIC_RESOLVER);

            factory.setENSAddrResolver(ENS_PUBLIC_RESOLVER);
            console.log("   [OK]ENS Addr Resolver set:", ENS_PUBLIC_RESOLVER);

            factory.setReverseRegistrar(ENS_REVERSE_REGISTRAR);
            console.log("   [OK]Reverse Registrar set:", ENS_REVERSE_REGISTRAR);

            factory.setCivitasParentNode(CIVITAS_PARENT_NODE);
            console.log("   [OK]Parent Node set:", vm.toString(CIVITAS_PARENT_NODE));
        }

        vm.stopBroadcast();

        console.log("");
        console.log("===================================================");
        console.log("  Deployment Complete!");
        console.log("===================================================");
        console.log("");
        console.log("Save these addresses:");
        console.log("   CIVITAS_FACTORY_ADDRESS =", address(factory));
        console.log("   RENT_VAULT_IMPL =", address(rentVaultImpl));
        console.log("   GROUP_BUY_ESCROW_IMPL =", address(groupBuyEscrowImpl));
        console.log("   STABLE_ALLOWANCE_TREASURY_IMPL =", address(treasuryImpl));
        console.log("");

        if (CIVITAS_PARENT_NODE == bytes32(0)) {
            console.log("NEXT STEPS:");
            console.log("   1. Run: npx tsx scripts/calculate-namehash.ts");
            console.log("   2. Copy the parent node hash");
            console.log("   3. Call: factory.setCivitasParentNode(0x...)");
            console.log("   4. Call: factory.setENSRegistry(0x1493b2567056c2181630115660963E13A8E32735)");
            console.log("   5. Call: factory.setENSTextResolver(0x6533C94869D28fAA8dF77cc63f9e2b2D6Cf77eBA)");
            console.log("   6. Call: factory.setENSAddrResolver(0x6533C94869D28fAA8dF77cc63f9e2b2D6Cf77eBA)");
        } else {
            console.log("[OK] Factory is fully configured and ready to use!");
            console.log("");
            console.log("Test it:");
            console.log("   1. Create a contract via your dApp");
            console.log("   2. Call: factory.createSubdomainAndSetRecords(...)");
            console.log("   3. Verify ENS: {basename}-{hash}.civitas.basetest.eth");
        }
        console.log("");
    }
}
