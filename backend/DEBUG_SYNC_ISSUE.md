# Debug: Contract Sync Failures

## Problem

26 out of 35 contracts are failing to sync, even though you say most are on Sepolia.

## Root Cause Investigation

The backend is trying to sync contracts but using **one global RPC client** that's hardcoded to Base Sepolia.

### Current Code Flow:

```typescript
// syncContracts.ts (line 22)
syncGenericContract(contract.contract_address)
  ↓
// sync.ts (line 15)
readTemplateContractState(contractAddress, contract.template_id)
  ↓
// template-reader.ts (line 19)
publicClient.readContract({ address: contractAddress, ... })
  ↓
// blockchain.ts (line 5-8)
export const publicClient = createPublicClient({
  chain: base,  // ❌ Hardcoded to base mainnet chain config
  transport: http(env.BASE_RPC_URL),  // But URL is Sepolia!
})
```

## The Bug!

Look at `/backend/src/config/blockchain.ts`:

```typescript
import { base } from 'viem/chains'  // ❌ WRONG! Should be baseSepolia

export const publicClient = createPublicClient({
  chain: base,  // ❌ This is Base MAINNET (chain ID 8453)
  transport: http(env.BASE_RPC_URL),  // But this is Sepolia RPC URL
})
```

**Mismatch:**
- `chain: base` → Chain ID 8453 (Base Mainnet)
- `BASE_RPC_URL` → https://sepolia.base.org (Base Sepolia, chain ID 84532)

This mismatch could cause:
1. Viem trying to query mainnet contracts on a testnet RPC
2. Contract calls failing because chain ID doesn't match
3. Silent failures that log as `error={}`

## The Fix

Change `blockchain.ts` to use `baseSepolia`:

```typescript
import { baseSepolia } from 'viem/chains'  // ✅ Correct chain

export const publicClient = createPublicClient({
  chain: baseSepolia,  // ✅ Chain ID 84532
  transport: http(env.BASE_RPC_URL),  // ✅ Matches Sepolia RPC
})
```

## Verification Steps

After fixing:

1. **Check which contracts are in your database**:
   ```sql
   -- Query Supabase
   SELECT chain_id, COUNT(*) as count
   FROM contracts
   GROUP BY chain_id;
   ```

2. **Verify failed contract addresses on Sepolia**:
   - Visit: https://sepolia.basescan.org/address/0x3af5371C272dC23B8752269825DeaD1C35B554d1
   - If it says "Address not found", contract doesn't exist on Sepolia

3. **Check if addresses are mainnet contracts**:
   - Visit: https://basescan.org/address/0x3af5371C272dC23B8752269825DeaD1C35B554d1
   - If it exists here, it's a mainnet contract in your DB

## Possible Scenarios

### Scenario A: Chain Config Mismatch (Most Likely)
- Backend config has wrong chain
- RPC URL is correct (Sepolia)
- Chain ID is wrong (mainnet 8453)
- Fix: Change `chain: base` to `chain: baseSepolia`

### Scenario B: Database Has Wrong Chain IDs
- Contracts are marked as `chain_id: 84532` (Sepolia)
- But they don't actually exist on Sepolia
- They're test/predicted addresses that were never deployed
- Fix: Clean up database

### Scenario C: Contracts Deployed on Wrong Network
- You thought you deployed to Sepolia
- But actually deployed to mainnet
- Database has wrong chain_id
- Fix: Update database chain_ids

## Quick Test

Check one of the failing addresses on block explorers:

```bash
# Sepolia
open "https://sepolia.basescan.org/address/0x3af5371C272dC23B8752269825DeaD1C35B554d1"

# Mainnet
open "https://basescan.org/address/0x3af5371C272dC23B8752269825DeaD1C35B554d1"
```

If contract exists on **mainnet** but not **Sepolia**, then:
- Either database has wrong chain_id
- Or contracts were deployed to wrong network

If contract exists on **Sepolia**, then:
- Backend chain config is wrong (Scenario A)
- Fix blockchain.ts

If contract exists on **neither**, then:
- These are predicted/test addresses never deployed
- Safe to ignore or clean up database
