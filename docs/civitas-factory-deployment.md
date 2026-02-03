# CivitasFactory Deployment Guide

This guide walks you through deploying the CivitasFactory and all 3 contract templates (RentVault, GroupBuyEscrow, StableAllowanceTreasury) to Base.

---

## Prerequisites

1. **Private key in .env file:**
```bash
cd contracts
```

Make sure your `.env` file has:
```env
PRIVATE_KEY=your_private_key_here
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASESCAN_API_KEY=your_basescan_api_key
```

2. **Fund your deployer wallet:**
- Base Sepolia (testnet): Get free ETH from [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)
- Base Mainnet: Need real ETH

---

## Deployment Commands

### Option 1: Deploy to Base Sepolia (Testnet) - RECOMMENDED FOR TESTING

```bash
cd contracts

# Load environment variables
source .env

# Deploy to Base Sepolia with verification
forge script script/DeployCivitasFactory.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  -vvvv
```

### Option 2: Deploy to Base Mainnet (Production)

```bash
cd contracts

# Load environment variables
source .env

# Deploy to Base Mainnet with verification
forge script script/DeployCivitasFactory.s.sol \
  --rpc-url https://mainnet.base.org \
  --broadcast \
  --verify \
  -vvvv
```

---

## Expected Output

When deployment succeeds, you'll see:

```
========================================
DEPLOYMENT SUMMARY
========================================
Network: Base Sepolia
Chain ID: 84532

USDC Address: 0x036CbD53842c5426634e7929541eC2318f3dCF7e

Implementation Contracts:
  RentVault: 0x1111111111111111111111111111111111111111
  GroupBuyEscrow: 0x2222222222222222222222222222222222222222
  StableAllowanceTreasury: 0x3333333333333333333333333333333333333333

Factory Contract:
  CivitasFactory: 0x4444444444444444444444444444444444444444

========================================
COPY THESE ADDRESSES FOR FRONTEND:
========================================
NEXT_PUBLIC_CIVITAS_FACTORY_ADDRESS= 0x4444444444444444444444444444444444444444
NEXT_PUBLIC_RENT_VAULT_IMPL= 0x1111111111111111111111111111111111111111
NEXT_PUBLIC_GROUP_BUY_ESCROW_IMPL= 0x2222222222222222222222222222222222222222
NEXT_PUBLIC_STABLE_ALLOWANCE_TREASURY_IMPL= 0x3333333333333333333333333333333333333333
========================================
```

---

## What to Provide Back to Claude

After deployment completes, provide these **4 addresses**:

### Required Information:

**Network deployed to:** (Base Sepolia or Base Mainnet)

**Addresses:**
```
CIVITAS_FACTORY_ADDRESS: 0x...
RENT_VAULT_IMPL: 0x...
GROUP_BUY_ESCROW_IMPL: 0x...
STABLE_ALLOWANCE_TREASURY_IMPL: 0x...
```

**Example response:**
```
Deployed to: Base Sepolia

CIVITAS_FACTORY_ADDRESS: 0x4444444444444444444444444444444444444444
RENT_VAULT_IMPL: 0x1111111111111111111111111111111111111111
GROUP_BUY_ESCROW_IMPL: 0x2222222222222222222222222222222222222222
STABLE_ALLOWANCE_TREASURY_IMPL: 0x3333333333333333333333333333333333333333
```

---

## Troubleshooting

### Error: "Insufficient funds for gas"

**Solution:** Fund your deployer wallet with ETH
- Get your deployer address: `cast wallet address $PRIVATE_KEY`
- Fund it with testnet ETH from faucet

### Error: "nonce too low"

**Solution:** Reset nonce
```bash
# This error usually resolves itself, just retry the command
```

### Error: "Contract verification failed"

**Solution:** Verify manually after deployment
```bash
forge verify-contract <CONTRACT_ADDRESS> \
  src/CivitasFactory.sol:CivitasFactory \
  --chain-id 84532 \
  --etherscan-api-key $BASESCAN_API_KEY \
  --constructor-args $(cast abi-encode "constructor(address,address,address,address)" <USDC> <IMPL1> <IMPL2> <IMPL3>)
```

### Error: "RPC connection failed"

**Solution:** Check your RPC URL
- Base Sepolia: `https://sepolia.base.org`
- Base Mainnet: `https://mainnet.base.org`
- Or use Alchemy/Infura URLs

---

## Verification

After deployment, verify contracts on BaseScan:

**Base Sepolia:**
- https://sepolia.basescan.org/address/YOUR_FACTORY_ADDRESS

**Base Mainnet:**
- https://basescan.org/address/YOUR_FACTORY_ADDRESS

---

## Next Steps

Once you provide the 4 addresses, I will:

1. ✅ Update `frontend/src/lib/contracts/constants.ts` with addresses
2. ✅ Add CivitasFactory ABIs to `frontend/src/lib/contracts/abis.ts`
3. ✅ Create `useCivitasContractDeploy` hook for all 3 templates
4. ✅ Create `/test-contract` page with template selection
5. ✅ Remove old RentalFactory code
6. ✅ Update deployment recovery system to work with new factory

---

## Cost Estimate

**Gas costs (approximate):**
- RentVault implementation: ~500,000 gas
- GroupBuyEscrow implementation: ~600,000 gas
- StableAllowanceTreasury implementation: ~400,000 gas
- CivitasFactory: ~800,000 gas

**Total: ~2,300,000 gas**

At 0.5 gwei (Base typical): ~0.001 ETH (~$3)

---

## Emergency: Cancel Deployment

If you need to stop deployment:
- Press `Ctrl+C` during broadcast
- If transaction already sent, you cannot cancel (it's on-chain)

---

## Summary

**Run this command:**
```bash
cd contracts
source .env
forge script script/DeployCivitasFactory.s.sol --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast --verify -vvvv
```

**Then provide me:**
- Network name (Base Sepolia or Base Mainnet)
- 4 contract addresses (factory + 3 implementations)

I'll handle the rest! 🚀
