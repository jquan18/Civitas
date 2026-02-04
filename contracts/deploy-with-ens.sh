#!/bin/bash

# Civitas Factory Deployment Script with ENS Integration
# Network: Base Sepolia Testnet

set -e  # Exit on error

echo "═══════════════════════════════════════════════════════════"
echo "  Civitas Factory Deployment - Base Sepolia"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Load environment variables from .env file
if [ -f .env ]; then
    echo "✅ Loading .env file..."
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ Error: .env file not found in contracts directory"
    exit 1
fi

# Check environment variables
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Error: PRIVATE_KEY not set"
    echo "   Set it in contracts/.env"
    exit 1
fi

if [ -z "$BASE_SEPOLIA_RPC_URL" ]; then
    echo "❌ Error: BASE_SEPOLIA_RPC_URL not set"
    echo "   Set it in contracts/.env"
    exit 1
fi

echo "✅ Environment variables loaded"
echo "✅ Deployer wallet: $(cast wallet address $PRIVATE_KEY)"
echo ""

# Deploy contracts
echo "Deploying Civitas Factory with ENS integration..."
echo ""

forge script script/DeployCivitasWithENS.s.sol \
    --rpc-url $BASE_SEPOLIA_RPC_URL \
    --broadcast \
    --verify \
    --etherscan-api-key $BASESCAN_API_KEY \
    -vvv

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Deployment Complete!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📝 Next steps:"
echo "   1. Copy the factory address from the output above"
echo "   2. Update frontend/src/lib/contracts/constants.ts"
echo "   3. Test by creating a contract via your dApp"
echo ""
