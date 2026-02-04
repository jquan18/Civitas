# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Civitas is an AI-powered cross-chain rental agreement platform built for ETH HackMoney 2026. It enables users to chat with AI to create rental contracts, deploy them to Base L2, and fund them from any chain using LI.FI. The project targets two prize tracks: "Best AI x LI.FI Smart App" ($2,000) and "Most Creative Use of ENS for DeFi" ($1,500).

**One-liner**: "The first AI Agent that negotiates, deploys, and funds cross-chain agreements in a single click."

## Tech Stack

- **Frontend**: Next.js 15 with App Router, TypeScript, Tailwind CSS
- **Web3**: RainbowKit v2, wagmi v2, viem
- **AI**: Gemini 3 Flash Preview (`gemini-2.5-flash`), Vercel AI SDK
- **Smart Contracts**: Solidity 0.8.20, Foundry
- **Cross-Chain**: LI.FI Widget
- **Identity**: Basenames (ENS on Base)
- **Database**: Supabase (PostgreSQL 17, Row Level Security)

## Architecture

### Three Core Pillars
1. **Logic (AI)**: Gemini converts natural language to smart contract configuration via Zod schemas
2. **Liquidity (LI.FI)**: Cross-chain bridging from any token on any chain to Base USDC
3. **Identity (ENS/Basenames)**: Human-readable contract addresses (e.g., `downtown-studio-6mo.civitas.base.eth`)

### System Flow
```
User Chat → AI Config Extraction → CREATE2 Address Prediction →
Contract Deployment (Tx #1) → LI.FI Bridge Funding (Tx #2) →
Balance-Based Activation → Basename Registration
```

## Development Commands

### Frontend
```bash
# Development server
npm run dev

# Production build
npm run build
npm run start

# Type checking
npm run build  # Will show TypeScript errors
```

### Smart Contracts
```bash
cd contracts

# Run all tests
forge test -vv

# Run specific test
forge test --match-test testInitialization -vv

# Run tests with detailed traces
forge test -vvvv

# Test with gas profiling
forge test --gas-report

# Deploy to Base Sepolia (testnet)
source .env
forge script script/Deploy.s.sol --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast --verify

# Deploy to Base Mainnet
forge script script/Deploy.s.sol --rpc-url base --broadcast --verify
```

## Local Development with Gemini Proxy

For local development, you can use a local Gemini API proxy (e.g., Antigravity) instead of the official Google API:

1. Start your local proxy server (e.g., on port 8045)
2. Set environment variables in `.env`:
   ```env
   GEMINI_LOCAL_API_KEY=your_proxy_api_key
   GEMINI_LOCAL_BASE_URL=http://127.0.0.1:8045
   ```
3. Run `npm run dev` - the app will automatically use the local proxy

The application automatically detects the environment:
- **Development** (`NODE_ENV=development`): Uses local proxy if configured, falls back to official API
- **Production**: Always uses official Google Generative AI API

The provider configuration is centralized in `lib/ai/google-provider.ts` and used by all AI endpoints:
- `api/chat/route.ts` - Streaming chat responses
- `api/extract-config/route.ts` - Config extraction
- `api/generate-name/route.ts` - Basename generation

For production deployments, only `GOOGLE_GENERATIVE_AI_API_KEY` is required.

## Key Design Decisions

### Smart Contracts

**CREATE2 Deployment with EIP-1167 Proxies**
- Factory uses OpenZeppelin Clones for gas-efficient deployment
- Salt = `keccak256(userAddress, suggestedName)` prevents collisions across users
- Predicted addresses allow pre-funding via LI.FI before contract exists on-chain

**Balance-Based Activation**
- Contract activates when `USDC.balanceOf(address(this)) >= requiredAmount`
- Handles async LI.FI bridge funding (1-5 minutes)
- No explicit `deposit()` call needed - any transfer method works

**Permissionless Rent Release**
- Anyone can call `releasePendingRent()` to release owed funds
- Calculates months elapsed vs months paid
- No keeper infrastructure required

**30-Day Termination Notice**
- Landlord initiates termination
- 30-day waiting period before finalization
- Pro-rata refund to tenant based on time elapsed

### AI Layer

**Structured Output with Zod Schemas**
- `RentalConfigSchema`: Extracts tenant, monthlyAmount, totalMonths
- `NameSuggestionSchema`: Generates semantic basename
- Auto-extraction after each AI response

**Streaming Chat**
- Uses Vercel AI SDK's `streamText()` for real-time responses
- `useChat` hook manages message state and streaming

### Frontend

**Split-Screen Create Page**
- Left: Streaming chat interface
- Right: Real-time contract preview card
- Config updates automatically as AI extracts information

**Deploy Modal Flow**
1. Generate semantic basename via AI
2. Predict CREATE2 address
3. User signs deployment transaction
4. LI.FI widget appears with locked destination (predicted address)
5. User bridges funds from any chain
6. Poll balance until contract activates

## Important File Locations

### Smart Contracts (`contracts/`)
- `src/CivitasFactory.sol`: Multi-template CREATE2 factory
- `src/RentVault.sol`: Enhanced rental agreement implementation
- `src/GroupBuyEscrow.sol`: Group purchase escrow implementation
- `src/StableAllowanceTreasury.sol`: Allowance-based treasury implementation
- `test/CivitasFactory.t.sol`: Factory tests
- `test/RentVault.t.sol`, `test/GroupBuyEscrow.t.sol`, etc: Template tests
- `script/DeployCivitasFactory.s.sol`: Deployment script
- `archive/`: Legacy rental contracts (deprecated Feb 2026)

### Frontend
- `app/create/page.tsx`: Split-screen chat + preview interface
- `app/dashboard/page.tsx`: Contract list (server-side rendering)
- `components/chat/ChatInterface.tsx`: Streaming chat UI
- `components/contract/ContractCard.tsx`: Real-time contract preview
- `components/deploy/DeployModal.tsx`: Deployment + funding orchestration
- `components/deploy/LiFiBridgeStep.tsx`: LI.FI widget integration

### AI Layer
- `app/api/chat/route.ts`: Streaming chat endpoint
- `app/api/extract-config/route.ts`: Structured config extraction
- `app/api/generate-name/route.ts`: Basename generation
- `lib/ai/schemas.ts`: Zod schemas for structured output
- `lib/ai/prompts.ts`: System prompts for AI

### Utilities
- `lib/contracts/constants.ts`: Contract addresses, chain config
- `lib/contracts/abis.ts`: Contract ABIs
- `lib/contracts/predict-address.ts`: CREATE2 address calculation
- `lib/contracts/fetch-contracts.ts`: Server-side contract fetching
- `lib/ens/resolver.ts`: ENS name resolution
- `lib/lifi/widget-config.ts`: LI.FI widget configuration
- `hooks/useRentalChat.ts`: Chat state + auto-extraction
- `hooks/useContractDeploy.ts`: Deployment orchestration

## 📚 Technical Documentation Reference
**Read these files for detailed syntax and API context when working on specific features:**

### ENS (Ethereum Name Service)
*Context: `contracts/src/*`, `lib/ens/*`, BASENAME integration*
- **[Smart Contracts](docs/tech/ens/ens-smart-contract.md)**: Core contract architecture, resolution process, registries.
- **[General Docs](docs/tech/ens/ens-docs.md)**: High-level overview.
> **Rule**: Uses `IENS` interface. Always normalize names before hashing.

### LI.FI (Bridging & Swapping)
*Context: `components/deploy/LiFiBridgeStep.tsx`, `lib/lifi/*`*
- **[API Reference](docs/tech/li.fi/lifi-api.md)**: Endpoints, authentication, error codes.
- **[SDK Guide](docs/tech/li.fi/lifi-sdk.md)**: Client-side SDK usage.
> **Rule**: Never expose `x-lifi-api-key` on client side. Handle `INSUFFICIENT_LIQUIDITY` errors.


## Environment Variables

Required in `.env.local`:
```env
# AI
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key

# Wallet
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# RPC
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
NEXT_PUBLIC_MAINNET_RPC_URL=https://eth.llamarpc.com

# Contracts (after deployment)
CIVITAS_FACTORY_ADDRESS=0x...
```

Required in `contracts/.env`:
```env
PRIVATE_KEY=your_private_key_here
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASESCAN_API_KEY=your_basescan_api_key
```

## Contract States

Contracts use integer state codes that vary by template. Common states:
- **0 (Deployed)**: Contract created but not yet active
- **1 (Active)**: Fully funded and operational
- **2+ (Various)**: Template-specific completion/terminal states

See template-specific documentation for detailed state machines.

## Key Constants

- **Base Chain ID**: 8453
- **Base USDC**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **USDC Decimals**: 6
- **Month Duration**: 30 days (in contracts)
- **Max Duration**: 60 months
- **Termination Notice**: 30 days

## Implementation Details

### CREATE2 Address Prediction
The factory uses OpenZeppelin's Clones library with deterministic salts. To predict an address client-side:
1. Calculate salt: `keccak256(abi.encode(userAddress, suggestedName))`
2. Get EIP-1167 proxy bytecode hash with implementation address
3. Use `getContractAddress()` with CREATE2 opcode

### LI.FI Integration
- Widget configuration locks destination to predicted contract address
- Locks destination chain to Base (8453)
- Locks destination token to USDC
- User selects source chain/token freely
- `useWidgetEvents` tracks bridge transaction status

### ENS Resolution
- Tenant field accepts ENS names (e.g., `bob.eth`) or addresses
- Resolution happens client-side before deployment
- Uses mainnet ENS resolver via viem
- Falls back to address validation if not ENS format

## AI Agent Date Handling

**Updated: February 4, 2026**

The AI agent automatically detects the user's timezone and converts natural language dates to ISO 8601 format.

### How It Works
1. **Timezone Detection** (`hooks/useUserTimezone.ts`): Automatically detects user's timezone from browser
2. **Temporal Context** (`lib/ai/temporal-context.ts`): Injects current date/time into every AI prompt
3. **Conversational Prompts** (`lib/ai/prompts.ts`): AI asks questions one at a time with date conversion examples
4. **Date Validation** (`lib/contracts/config-transformer.ts`): Validates and converts dates before deployment

### Examples
- User: "2nd of each month" → AI: "Would the first payment be on February 2nd, 2026?" → Converts to `"2026-02-02T00:00:00.000Z"`
- User: "next Friday" → AI calculates actual date based on user's timezone
- User: "March 15th" → AI adds current year if missing

### Date Format Standard
- **Input**: Natural language or ISO 8601 (`YYYY-MM-DDTHH:MM:SS.000Z`)
- **Storage**: Unix timestamp (BigInt seconds)
- **Validation**: `parseDateToBigInt()` helper provides clear error messages

See `IMPLEMENTATION_SUMMARY.md` for full technical details.

## Development Workflow

### Adding a New Feature
1. Review design doc: `docs/plans/2026-02-01-civitas-design.md`
2. Check implementation plan: `docs/plans/2026-02-01-civitas-implementation.md`
3. Write failing tests first (contracts)
4. Implement feature
5. Verify tests pass
6. Update relevant documentation

### Testing Smart Contracts
Always run tests before committing contract changes:
```bash
cd contracts
forge test -vv
```

Use `-vvv` or `-vvvv` for more verbose output when debugging.

### Testing Frontend
Build to catch TypeScript errors:
```bash
npm run build
```

Test locally with production build:
```bash
npm run start
```

## Common Patterns

### Handling USDC Amounts
USDC has 6 decimals on Base. Always use:
```typescript
import { parseUnits, formatUnits } from 'viem';

// User input → Wei
const weiAmount = parseUnits(userInput, 6);

// Wei → Display
const displayAmount = formatUnits(contractAmount, 6);
```

### Contract Interaction
Use wagmi v2 hooks:
```typescript
import { useReadContract, useWriteContract } from 'wagmi';

// Read
const { data } = useReadContract({
  address: contractAddress,
  abi: RECURRING_RENT_ABI,
  functionName: 'state',
});

// Write
const { writeContract } = useWriteContract();
writeContract({
  address: contractAddress,
  abi: RECURRING_RENT_ABI,
  functionName: 'releasePendingRent',
});
```

### AI Structured Output
Use Vercel AI SDK with Zod schemas:
```typescript
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

const schema = z.object({
  field: z.string().describe('Description'),
});

const { object } = await generateObject({
  model: google('gemini-2.5-flash'),
  schema,
  prompt: 'Extract...',
});
```

## Troubleshooting

### "Contract not activating after funding"
- Check balance: Contract needs `monthlyAmount * totalMonths` USDC
- Call `checkAndActivate()` if balance threshold met but state still Deployed
- Verify you're checking the predicted address (CREATE2)

### "ENS resolution failing"
- Ensure mainnet RPC URL is set in environment variables
- Check if name is valid ENS format (ends with `.eth`)
- Try resolving manually on Etherscan to verify name exists

### "LI.FI widget not appearing"
- Verify WalletConnect project ID is set
- Check that predicted address is valid
- Ensure user's wallet is connected

### "TypeScript errors with wagmi/viem"
- Make sure versions match: wagmi v2 + viem v2
- Check that chain is imported from `wagmi/chains` not `viem/chains`
- Verify address format is `0x${string}` not just `string`

## Future Roadmap

See `docs/plans/2026-02-01-civitas-design.md` section 10 for:
- Phase 2: AI-generated FSM (dynamic contract logic)
- Phase 3: Additional templates (escrow, payment splitter, betting)
- Phase 4: Production hardening (account abstraction, gas sponsorship, subgraph indexing)
