// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {RentVault} from "../src/RentVault.sol";
import {GroupBuyEscrow} from "../src/GroupBuyEscrow.sol";
import {StableAllowanceTreasury} from "../src/StableAllowanceTreasury.sol";
import {CivitasFactory} from "../src/CivitasFactory.sol";

/**
 * @title DeployCivitasFactory
 * @notice Deployment script for CivitasFactory and all implementation contracts
 *
 * This script deploys:
 * 1. RentVault implementation
 * 2. GroupBuyEscrow implementation
 * 3. StableAllowanceTreasury implementation
 * 4. CivitasFactory (with all 3 implementations)
 *
 * Usage:
 * forge script script/DeployCivitasFactory.s.sol --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast --verify
 */
contract DeployCivitasFactory is Script {
    // Base USDC address (same on mainnet and testnet)
    address constant USDC_BASE_MAINNET = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address constant USDC_BASE_SEPOLIA = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        // Determine which USDC address to use based on chain ID
        uint256 chainId = block.chainid;
        address usdcAddress;

        if (chainId == 8453) {
            // Base Mainnet
            usdcAddress = USDC_BASE_MAINNET;
            console.log("Deploying to Base Mainnet (chainId: 8453)");
        } else if (chainId == 84532) {
            // Base Sepolia
            usdcAddress = USDC_BASE_SEPOLIA;
            console.log("Deploying to Base Sepolia (chainId: 84532)");
        } else {
            revert("Unsupported chain ID. Use Base Mainnet (8453) or Base Sepolia (84532)");
        }

        console.log("Deployer address:", deployer);
        console.log("USDC address:", usdcAddress);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy RentVault implementation
        console.log("1/4 Deploying RentVault implementation...");
        RentVault rentVaultImpl = new RentVault();
        console.log("   RentVault implementation deployed at:", address(rentVaultImpl));
        console.log("");

        // 2. Deploy GroupBuyEscrow implementation
        console.log("2/4 Deploying GroupBuyEscrow implementation...");
        GroupBuyEscrow groupBuyEscrowImpl = new GroupBuyEscrow();
        console.log("   GroupBuyEscrow implementation deployed at:", address(groupBuyEscrowImpl));
        console.log("");

        // 3. Deploy StableAllowanceTreasury implementation
        console.log("3/4 Deploying StableAllowanceTreasury implementation...");
        StableAllowanceTreasury treasuryImpl = new StableAllowanceTreasury();
        console.log("   StableAllowanceTreasury implementation deployed at:", address(treasuryImpl));
        console.log("");

        // 4. Deploy CivitasFactory
        console.log("4/4 Deploying CivitasFactory...");
        CivitasFactory factory = new CivitasFactory(
            usdcAddress,
            address(rentVaultImpl),
            address(groupBuyEscrowImpl),
            address(treasuryImpl)
        );
        console.log("   CivitasFactory deployed at:", address(factory));
        console.log("");

        vm.stopBroadcast();

        // Print summary
        console.log("========================================");
        console.log("DEPLOYMENT SUMMARY");
        console.log("========================================");
        console.log("Network:", chainId == 8453 ? "Base Mainnet" : "Base Sepolia");
        console.log("Chain ID:", chainId);
        console.log("");
        console.log("USDC Address:", usdcAddress);
        console.log("");
        console.log("Implementation Contracts:");
        console.log("  RentVault:", address(rentVaultImpl));
        console.log("  GroupBuyEscrow:", address(groupBuyEscrowImpl));
        console.log("  StableAllowanceTreasury:", address(treasuryImpl));
        console.log("");
        console.log("Factory Contract:");
        console.log("  CivitasFactory:", address(factory));
        console.log("");
        console.log("========================================");
        console.log("COPY THESE ADDRESSES FOR FRONTEND:");
        console.log("========================================");
        console.log("NEXT_PUBLIC_CIVITAS_FACTORY_ADDRESS=", address(factory));
        console.log("NEXT_PUBLIC_RENT_VAULT_IMPL=", address(rentVaultImpl));
        console.log("NEXT_PUBLIC_GROUP_BUY_ESCROW_IMPL=", address(groupBuyEscrowImpl));
        console.log("NEXT_PUBLIC_STABLE_ALLOWANCE_TREASURY_IMPL=", address(treasuryImpl));
        console.log("========================================");
    }
}
