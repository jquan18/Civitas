#!/bin/bash

# =============================================================
# Civitas ENS Integration - Phase 1 Verification Script
# =============================================================
# Tests the full ENS flow:
#   0. Fix factory ENS config (previous agent used mainnet addrs)
#   1. Approve factory as operator on the correct ENS registry
#   2. Deploy a test RentVault via the factory
#   3. Create a subdomain and set ENS records
#   4. Verify the ENS records were set correctly
# =============================================================

set -e

# Load environment
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "Error: .env file not found in contracts directory"
    exit 1
fi

# Correct Base Sepolia addresses (from github.com/base/basenames)
FACTORY=0x1cF969a2D882A09927f051D4F8e9e31160Abe894
DEPLOYER=$(cast wallet address $PRIVATE_KEY)
RPC=$BASE_SEPOLIA_RPC_URL

# Correct Base Sepolia ENS addresses
ENS_REGISTRY=0x1493b2567056c2181630115660963E13A8E32735
ENS_RESOLVER=0x6533C94869D28fAA8dF77cc63f9e2b2D6Cf77eBA
ENS_REVERSE_REGISTRAR=0x876eF94ce0773052a2f81921E70FF25a5e76841f
PARENT_NODE=0x1cbe20cfde3e946c37b02416f99842c64646625dd3d54f636c384d31c291523b

echo "==================================================="
echo "  Civitas ENS Integration - Phase 1 Test"
echo "==================================================="
echo "Factory:            $FACTORY"
echo "Deployer:           $DEPLOYER"
echo "ENS Registry:       $ENS_REGISTRY"
echo "ENS Resolver:       $ENS_RESOLVER"
echo "Reverse Registrar:  $ENS_REVERSE_REGISTRAR"
echo "Parent Node:        $PARENT_NODE"
echo "RPC:                $RPC"
echo ""

# ---------------------------------------------------------
# Step 0: Verify ENS contracts exist
# ---------------------------------------------------------
echo "Step 0: Verifying ENS contracts have code..."
echo ""

REGISTRY_CODE=$(cast code $ENS_REGISTRY --rpc-url $RPC)
if [ "$REGISTRY_CODE" = "0x" ] || [ -z "$REGISTRY_CODE" ]; then
    echo "ERROR: ENS Registry at $ENS_REGISTRY has no code!"
    exit 1
fi
echo "  Registry:          has code"

RESOLVER_CODE=$(cast code $ENS_RESOLVER --rpc-url $RPC)
if [ "$RESOLVER_CODE" = "0x" ] || [ -z "$RESOLVER_CODE" ]; then
    echo "ERROR: ENS Resolver at $ENS_RESOLVER has no code!"
    exit 1
fi
echo "  Resolver:          has code"

echo ""

# ---------------------------------------------------------
# Step 1: Fix factory ENS config
# ---------------------------------------------------------
echo "Step 1: Updating factory ENS configuration..."
echo ""

# Check current config
CURRENT_REGISTRY=$(cast call $FACTORY "ensRegistry()(address)" --rpc-url $RPC)
echo "  Current registry:  $CURRENT_REGISTRY"
echo "  Correct registry:  $ENS_REGISTRY"

CURRENT_REGISTRY_LOWER=$(echo $CURRENT_REGISTRY | tr '[:upper:]' '[:lower:]')
ENS_REGISTRY_LOWER=$(echo $ENS_REGISTRY | tr '[:upper:]' '[:lower:]')

if [ "$CURRENT_REGISTRY_LOWER" != "$ENS_REGISTRY_LOWER" ]; then
    echo "  Updating ENS Registry..."
    cast send $FACTORY "setENSRegistry(address)" $ENS_REGISTRY --private-key $PRIVATE_KEY --rpc-url $RPC > /dev/null 2>&1
    echo "  [OK] Registry updated"
else
    echo "  [OK] Registry already correct"
fi

CURRENT_TEXT_RESOLVER=$(cast call $FACTORY "ensTextResolver()(address)" --rpc-url $RPC)
CURRENT_TEXT_LOWER=$(echo $CURRENT_TEXT_RESOLVER | tr '[:upper:]' '[:lower:]')
ENS_RESOLVER_LOWER=$(echo $ENS_RESOLVER | tr '[:upper:]' '[:lower:]')

if [ "$CURRENT_TEXT_LOWER" != "$ENS_RESOLVER_LOWER" ]; then
    echo "  Updating ENS Text Resolver..."
    cast send $FACTORY "setENSTextResolver(address)" $ENS_RESOLVER --private-key $PRIVATE_KEY --rpc-url $RPC > /dev/null 2>&1
    echo "  [OK] Text Resolver updated"
else
    echo "  [OK] Text Resolver already correct"
fi

CURRENT_ADDR_RESOLVER=$(cast call $FACTORY "ensAddrResolver()(address)" --rpc-url $RPC)
CURRENT_ADDR_LOWER=$(echo $CURRENT_ADDR_RESOLVER | tr '[:upper:]' '[:lower:]')

if [ "$CURRENT_ADDR_LOWER" != "$ENS_RESOLVER_LOWER" ]; then
    echo "  Updating ENS Addr Resolver..."
    cast send $FACTORY "setENSAddrResolver(address)" $ENS_RESOLVER --private-key $PRIVATE_KEY --rpc-url $RPC > /dev/null 2>&1
    echo "  [OK] Addr Resolver updated"
else
    echo "  [OK] Addr Resolver already correct"
fi

CURRENT_REVERSE=$(cast call $FACTORY "reverseRegistrar()(address)" --rpc-url $RPC)
CURRENT_REVERSE_LOWER=$(echo $CURRENT_REVERSE | tr '[:upper:]' '[:lower:]')
REVERSE_LOWER=$(echo $ENS_REVERSE_REGISTRAR | tr '[:upper:]' '[:lower:]')

if [ "$CURRENT_REVERSE_LOWER" != "$REVERSE_LOWER" ]; then
    echo "  Updating Reverse Registrar..."
    cast send $FACTORY "setReverseRegistrar(address)" $ENS_REVERSE_REGISTRAR --private-key $PRIVATE_KEY --rpc-url $RPC > /dev/null 2>&1
    echo "  [OK] Reverse Registrar updated"
else
    echo "  [OK] Reverse Registrar already correct"
fi

echo ""

# ---------------------------------------------------------
# Step 2: Check parent node ownership and approval
# ---------------------------------------------------------
echo "Step 2: Checking parent node ownership and approval..."
echo ""

PARENT_OWNER=$(cast call $ENS_REGISTRY "owner(bytes32)(address)" $PARENT_NODE --rpc-url $RPC)
echo "  Parent node owner: $PARENT_OWNER"
echo "  Deployer:          $DEPLOYER"

PARENT_OWNER_LOWER=$(echo $PARENT_OWNER | tr '[:upper:]' '[:lower:]')
DEPLOYER_LOWER=$(echo $DEPLOYER | tr '[:upper:]' '[:lower:]')

if [ "$PARENT_OWNER_LOWER" != "$DEPLOYER_LOWER" ]; then
    echo ""
    echo "  WARNING: Deployer does not own the parent node!"
    echo "  The parent node owner is: $PARENT_OWNER"
    echo "  You may need to register civitas.basetest.eth first."
    echo ""
    echo "  Continuing anyway to check approval..."
fi

IS_APPROVED=$(cast call $ENS_REGISTRY "isApprovedForAll(address,address)(bool)" $DEPLOYER $FACTORY --rpc-url $RPC)
echo "  Factory approved:  $IS_APPROVED"

if [ "$IS_APPROVED" != "true" ]; then
    echo "  Approving factory as operator on ENS registry..."
    cast send $ENS_REGISTRY "setApprovalForAll(address,bool)" $FACTORY true --private-key $PRIVATE_KEY --rpc-url $RPC > /dev/null 2>&1
    echo "  [OK] Factory approved"
else
    echo "  [OK] Factory already approved"
fi

echo ""

# Wait for nonce to sync after config updates
echo "  Waiting for nonce to sync..."
sleep 5

# ---------------------------------------------------------
# Step 3: Deploy a test RentVault
# ---------------------------------------------------------
echo "Step 3: Deploying test RentVault..."
echo ""

# Due date must be in the future - set to 6 months from now
DUE_DATE=$(date -v+6m +%s)
echo "  Due date: $DUE_DATE ($(date -r $DUE_DATE))"

# Get current nonce to avoid stale nonce errors
NONCE=$(cast nonce $DEPLOYER --rpc-url $RPC)
echo "  Using nonce: $NONCE"

TX_OUTPUT=$(cast send $FACTORY "createRentVault(address,uint256,uint256,address[],uint256[])" $DEPLOYER 1000000000 $DUE_DATE "[$DEPLOYER]" "[10000]" --private-key $PRIVATE_KEY --rpc-url $RPC --nonce $NONCE --json)

TX_HASH=$(echo $TX_OUTPUT | jq -r '.transactionHash')
TX_STATUS=$(echo $TX_OUTPUT | jq -r '.status')

echo "  TX Hash:  $TX_HASH"
echo "  Status:   $TX_STATUS"

if [ "$TX_STATUS" != "0x1" ]; then
    echo "  ERROR: RentVault deployment failed!"
    exit 1
fi

# Extract clone address from RentVaultCreated event
# Event: RentVaultCreated(address indexed creator, address indexed clone, address indexed recipient)
# Signature: 0xae3bd2157f4927c280cea480534d7c78f76ba2686381ec34b15ee85e03558902
CLONE_ADDRESS=$(echo $TX_OUTPUT | jq -r '.logs[] | select(.topics[0] == "0xae3bd2157f4927c280cea480534d7c78f76ba2686381ec34b15ee85e03558902") | .topics[2]' | sed 's/0x000000000000000000000000/0x/')

if [ -z "$CLONE_ADDRESS" ] || [ "$CLONE_ADDRESS" = "null" ] || [ "$CLONE_ADDRESS" = "0x" ]; then
    echo "  ERROR: Failed to extract clone address from logs!"
    echo "  Raw logs:"
    echo $TX_OUTPUT | jq '.logs'
    exit 1
fi

echo "  Clone:    $CLONE_ADDRESS"
echo ""
echo "  [OK] RentVault deployed"
echo ""

# ---------------------------------------------------------
# Step 4: Simulate ENS record creation first
# ---------------------------------------------------------
echo "Step 4: Creating ENS subdomain and setting records..."
echo ""

# Simulate first to catch errors with a readable message
echo "  Simulating transaction..."
SIMULATE_OUTPUT=$(cast call $FACTORY "createSubdomainAndSetRecords(address,string,string[],string[])" $CLONE_ADDRESS "test-rent" "[contract.type,contract.status,contract.rent.amount]" "[RentVault,Active,1000000000]" --from $DEPLOYER --rpc-url $RPC 2>&1) || {
    echo "  ERROR: Simulation failed!"
    echo "  Reason: $SIMULATE_OUTPUT"
    echo ""
    echo "  Debug info:"
    echo "    Factory:       $FACTORY"
    echo "    Clone:         $CLONE_ADDRESS"
    echo "    Registry:      $(cast call $FACTORY 'ensRegistry()(address)' --rpc-url $RPC)"
    echo "    Text Resolver: $(cast call $FACTORY 'ensTextResolver()(address)' --rpc-url $RPC)"
    echo "    Addr Resolver: $(cast call $FACTORY 'ensAddrResolver()(address)' --rpc-url $RPC)"
    echo "    Parent Owner:  $(cast call $ENS_REGISTRY 'owner(bytes32)(address)' $PARENT_NODE --rpc-url $RPC)"
    echo "    Approved:      $(cast call $ENS_REGISTRY 'isApprovedForAll(address,address)(bool)' $DEPLOYER $FACTORY --rpc-url $RPC)"
    exit 1
}

echo "  Simulation passed. Sending transaction..."

sleep 3
NONCE=$(cast nonce $DEPLOYER --rpc-url $RPC)
ENS_TX_OUTPUT=$(cast send $FACTORY "createSubdomainAndSetRecords(address,string,string[],string[])" $CLONE_ADDRESS "test-rent" "[contract.type,contract.status,contract.rent.amount]" "[RentVault,Active,1000000000]" --private-key $PRIVATE_KEY --rpc-url $RPC --nonce $NONCE --json)

ENS_TX_HASH=$(echo $ENS_TX_OUTPUT | jq -r '.transactionHash')
ENS_TX_STATUS=$(echo $ENS_TX_OUTPUT | jq -r '.status')

echo "  TX Hash:  $ENS_TX_HASH"
echo "  Status:   $ENS_TX_STATUS"

if [ "$ENS_TX_STATUS" != "0x1" ]; then
    echo "  ERROR: ENS record creation failed!"
    exit 1
fi

echo ""
echo "  [OK] ENS records created"
echo ""

# ---------------------------------------------------------
# Step 5: Determine the full basename
# ---------------------------------------------------------
echo "Step 5: Resolving full basename..."
echo ""

# The factory appends first 8 hex chars of the clone address
ADDR_SUFFIX=$(echo $CLONE_ADDRESS | sed 's/0x//' | cut -c1-8 | tr '[:upper:]' '[:lower:]')
FULL_BASENAME="test-rent-${ADDR_SUFFIX}"

echo "  Full basename: $FULL_BASENAME"
echo "  ENS name:      ${FULL_BASENAME}.civitas.basetest.eth"
echo ""

# ---------------------------------------------------------
# Step 6: Verify ENS records
# ---------------------------------------------------------
echo "Step 6: Verifying ENS records..."
echo ""

# Get the ENS node for this basename
ENS_NODE=$(cast call $FACTORY "calculateENSNode(string)(bytes32)" $FULL_BASENAME --rpc-url $RPC)
echo "  ENS Node: $ENS_NODE"
echo ""

# Verify contract.type
TYPE_RECORD=$(cast call $ENS_RESOLVER "text(bytes32,string)(string)" $ENS_NODE "contract.type" --rpc-url $RPC)
echo "  contract.type:        $TYPE_RECORD"

# Verify contract.status
STATUS_RECORD=$(cast call $ENS_RESOLVER "text(bytes32,string)(string)" $ENS_NODE "contract.status" --rpc-url $RPC)
echo "  contract.status:      $STATUS_RECORD"

# Verify contract.rent.amount
AMOUNT_RECORD=$(cast call $ENS_RESOLVER "text(bytes32,string)(string)" $ENS_NODE "contract.rent.amount" --rpc-url $RPC)
echo "  contract.rent.amount: $AMOUNT_RECORD"

# Verify forward resolution (addr record)
ADDR_RECORD=$(cast call $ENS_RESOLVER "addr(bytes32)(address)" $ENS_NODE --rpc-url $RPC)
echo "  addr (forward):       $ADDR_RECORD"

echo ""

# ---------------------------------------------------------
# Step 7: Verify basename mapping
# ---------------------------------------------------------
echo "Step 7: Verifying basename-to-contract mapping..."
echo ""

MAPPED_ADDRESS=$(cast call $FACTORY "getContractByBasename(string)(address)" $FULL_BASENAME --rpc-url $RPC)
echo "  basenameToContract: $MAPPED_ADDRESS"
echo "  Expected:           $CLONE_ADDRESS"
echo ""

# ---------------------------------------------------------
# Summary
# ---------------------------------------------------------
echo "==================================================="
echo "  Phase 1 Verification Results"
echo "==================================================="
echo ""
echo "  RentVault clone:     $CLONE_ADDRESS"
echo "  Full basename:       $FULL_BASENAME"
echo "  ENS name:            ${FULL_BASENAME}.civitas.basetest.eth"
echo ""
echo "  Text Records:"
echo "    contract.type:        $TYPE_RECORD"
echo "    contract.status:      $STATUS_RECORD"
echo "    contract.rent.amount: $AMOUNT_RECORD"
echo ""
echo "  Forward resolution:  $ADDR_RECORD"
echo "  Basename mapping:    $MAPPED_ADDRESS"
echo ""

# Check results - strip surrounding quotes from cast output
PASS=true
TYPE_CLEAN=$(echo $TYPE_RECORD | tr -d '"')
STATUS_CLEAN=$(echo $STATUS_RECORD | tr -d '"')
AMOUNT_CLEAN=$(echo $AMOUNT_RECORD | tr -d '"')

if [ "$TYPE_CLEAN" != "RentVault" ]; then
    echo "  FAIL: contract.type expected 'RentVault', got '$TYPE_CLEAN'"
    PASS=false
fi

if [ "$STATUS_CLEAN" != "Active" ]; then
    echo "  FAIL: contract.status expected 'Active', got '$STATUS_CLEAN'"
    PASS=false
fi

if [ "$AMOUNT_CLEAN" != "1000000000" ]; then
    echo "  FAIL: contract.rent.amount expected '1000000000', got '$AMOUNT_CLEAN'"
    PASS=false
fi

CLONE_LOWER=$(echo $CLONE_ADDRESS | tr '[:upper:]' '[:lower:]')
ADDR_LOWER=$(echo $ADDR_RECORD | tr '[:upper:]' '[:lower:]')
MAPPED_LOWER=$(echo $MAPPED_ADDRESS | tr '[:upper:]' '[:lower:]')

if [ "$ADDR_LOWER" != "$CLONE_LOWER" ]; then
    echo "  FAIL: Forward resolution mismatch"
    PASS=false
fi

if [ "$MAPPED_LOWER" != "$CLONE_LOWER" ]; then
    echo "  FAIL: Basename mapping mismatch"
    PASS=false
fi

if [ "$PASS" = true ]; then
    echo "  ALL CHECKS PASSED - Phase 1 ENS integration is working!"
else
    echo ""
    echo "  Some checks failed. Review the output above."
fi

echo "==================================================="
