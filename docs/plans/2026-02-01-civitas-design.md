# Civitas Design Document

**Date:** 2026-02-01
**Project:** Civitas - AI-Powered Cross-Chain Rental Agreements
**Target:** ETH HackMoney 2026 - LI.FI + ENS Tracks

---

## 1. Executive Summary

**One-liner:** "The first AI Agent that negotiates, deploys, and funds cross-chain agreements in a single click."

Civitas eliminates the complexity of creating financial agreements on-chain. Users chat with an AI to define rental terms, and the system handles:
- **Logic (AI)** - Natural language to smart contract configuration
- **Liquidity (LI.FI)** - Cross-chain funding from any token on any chain
- **Identity (ENS/Basenames)** - Human-readable contract addresses

### Target Prizes
1. **Best AI x LI.FI Smart App** - $2,000
Awarded to the most innovative AI-powered agent or smart app that uses LI.FI as its cross-chain execution layer.
Examples:
An on-chain or off-chain agent that uses LI.FI routes to manage positions, rebalance liquidity, or execute cross-chain strategies automatically.
A rebalancing bot that moves liquidity or collateral between chains to maintain target allocations. An arbitrage or routing agent that uses LI.FI quotes as part of its strategy.
etc
Qualification Requirements
Use LI.FI programmatically (SDK/API or contract calls) to perform cross-chain actions.
Implement a clear strategy loop: monitor state, decide, then act using LI.FI.
Provide either a minimal UI or a clear CLI/script demo with logs.
Your submission must include a video demo and Github URL of the project
2. **Most Creative Use of ENS for DeFi** - $1,500
ENS is often thought of as simple name <> address mapping, but really its much more flexible! Names can store arbitrary data via text records, decentralized websites via content hash and more.
This prize goes to the most creative application of ENS in DeFi. This could be some sort of swap preferences stored in text records, DEX contracts that are named via ENS, decentralized interfaces or anything else.
Qualification Requirements
It should be obvious how ENS improves your product and is not just implemented as an afterthought. Your demo must be functional and not just include hard-coded values. Upon submission, your project showcase must have a video recording or link to a live demo (ideally both) and the code needs to be open source and accessible on Github or a similar platform.

---

## 2. User Flow (Demo Happy Path)

### Phase 1: Negotiation (Chat)
1. User types: "I want to rent my apartment to bob.eth for 6 months at 1000 USDC per month"
2. AI parses intent, extracts structured config
3. Contract Card materializes in real-time on the right panel

### Phase 2: Execution (Magic Click)
4. User clicks "Sign & Fund"
5. **Tx #1:** Factory deploys rental contract to predicted CREATE2 address
6. **Tx #2:** LI.FI bridges funds from any chain to the contract
7. Contract activates when `balanceOf >= requiredAmount`

### Phase 3: Identity & Result
8. Basename registered: `downtown-studio-6mo-a3f9.civitas.base.eth`
9. Dashboard shows: Contract Deployed ✅, Funds Received ✅, Name Registered ✅

---

## 3. Technical Architecture

### 3.1 System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  Next.js 15 + React Server Components + RainbowKit v2           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  Chat Panel  │    │ Contract Card│    │  Dashboard   │      │
│  │  (Streaming) │───▶│ (Real-time)  │    │  (SSR)       │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                                    │
└─────────┼───────────────────┼────────────────────────────────────┘
          │                   │
          ▼                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API LAYER                                   │
│  Next.js API Routes + Vercel AI SDK                             │
├─────────────────────────────────────────────────────────────────┤
│  /api/chat          → Streaming chat (Gemini 3 Flash)           │
│  /api/extract-config → Structured output (Zod schema)           │
│  /api/generate-name  → Semantic basename generation             │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                   SMART CONTRACTS (Base L2)                      │
├─────────────────────────────────────────────────────────────────┤
│  RentalFactory.sol                                               │
│  ├── deployRental() → CREATE2 + Minimal Proxy (EIP-1167)       │
│  ├── predictRentalAddress() → Deterministic address calc        │
│  └── registerBasename() → ENS subdomain registration            │
│                                                                  │
│  RecurringRent.sol (Implementation)                              │
│  ├── States: Deployed → Active → Completed/Terminated           │
│  ├── Balance-based activation (handles async funding)           │
│  ├── Permissionless rent release                                 │
│  └── Early termination with 30-day notice                       │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    INTEGRATIONS                                  │
├─────────────────────────────────────────────────────────────────┤
│  LI.FI Widget                                                    │
│  ├── Cross-chain bridging from any token/chain                  │
│  ├── Destination locked to predicted contract address           │
│  └── useWidgetEvents for transaction tracking                   │
│                                                                  │
│  Basenames (ENS on Base)                                         │
│  ├── Parent domain: civitas.base.eth                            │
│  ├── Subdomains: {name}-{hash}.civitas.base.eth                 │
│  └── Text records store agreement metadata                      │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | Next.js 15 + App Router | RSC for performance, streaming support |
| Wallet | RainbowKit v2 + wagmi v2 + viem | Industry standard, `getDefaultConfig` API |
| AI | Gemini 3 Flash (`gemini-3-flash-preview`) | Fast, cheap ($0.50/1M input), structured output |
| AI SDK | Vercel AI SDK (`@ai-sdk/google`) | Streaming, Zod schema support |
| Contracts | Foundry + Solidity 0.8.20 | Best testing, CREATE2 support |
| Cross-chain | LI.FI Widget + SDK | 60+ chains, automatic routing |
| Identity | Basenames (ENS on Base) | Native to Base, subdomain registration |
| Styling | Tailwind CSS | Fast iteration |

---

## 4. Smart Contract Design

### 4.1 RentalFactory.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RentalFactory is Ownable {
    using Clones for address;

    address public immutable implementation;
    mapping(bytes32 => address) public authorizedDeployments;

    // Basenames integration
    IBaseRegistrar public baseRegistrar;
    bytes32 public constant CIVITAS_NODE = keccak256("civitas.base.eth");

    event RentalDeployed(
        address indexed creator,
        address indexed rental,
        string basename
    );

    function deployRental(
        address landlord,
        address tenant,
        uint256 monthlyAmount,
        uint8 totalMonths,
        string calldata suggestedName
    ) external returns (address rental) {
        // Generate salt: keccak256(msg.sender, suggestedName)
        bytes32 salt = keccak256(abi.encode(msg.sender, suggestedName));

        // Anti-snipe protection
        require(
            authorizedDeployments[salt] == address(0) ||
            authorizedDeployments[salt] == msg.sender,
            "Unauthorized"
        );

        // Deploy using OpenZeppelin Clones
        rental = implementation.cloneDeterministic(salt);

        // Initialize
        RecurringRent(rental).initialize(
            landlord, tenant, monthlyAmount, totalMonths
        );

        // Register Basename
        string memory fullName = _generateUniqueName(suggestedName, salt);
        _registerBasename(rental, fullName);

        delete authorizedDeployments[salt];

        emit RentalDeployed(msg.sender, rental, fullName);
    }

    function predictRentalAddress(
        address deployer,
        string calldata suggestedName
    ) external view returns (address) {
        bytes32 salt = keccak256(abi.encode(deployer, suggestedName));
        return implementation.predictDeterministicAddress(salt);
    }
}
```

### 4.2 RecurringRent.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract RecurringRent is Initializable {
    // Base USDC
    IERC20 public constant USDC = IERC20(0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913);

    address public landlord;
    address public tenant;
    uint256 public monthlyAmount;
    uint8 public totalMonths;
    uint256 public startTime;
    uint256 public totalPaid;

    enum State { Deployed, Active, Completed, TerminationPending, Terminated }
    State public state;
    uint256 public terminationNoticeTime;

    function initialize(
        address _landlord,
        address _tenant,
        uint256 _monthlyAmount,
        uint8 _totalMonths
    ) external initializer {
        landlord = _landlord;
        tenant = _tenant;
        monthlyAmount = _monthlyAmount;
        totalMonths = _totalMonths;
        state = State.Deployed;
    }

    // Balance-based activation (handles async LI.FI funding)
    function checkAndActivate() public {
        if (state == State.Deployed &&
            USDC.balanceOf(address(this)) >= monthlyAmount * totalMonths) {
            state = State.Active;
            startTime = block.timestamp;
        }
    }

    // Permissionless rent release
    function releasePendingRent() external {
        checkAndActivate();
        require(state == State.Active, "Not active");

        uint256 monthsElapsed = (block.timestamp - startTime) / 30 days;
        if (monthsElapsed > totalMonths) monthsElapsed = totalMonths;

        uint256 monthsPaid = totalPaid / monthlyAmount;
        uint256 toPay = (monthsElapsed - monthsPaid) * monthlyAmount;

        require(toPay > 0, "Nothing to release");

        totalPaid += toPay;
        USDC.transfer(landlord, toPay);

        if (totalPaid >= monthlyAmount * totalMonths) {
            state = State.Completed;
        }
    }

    // Early termination (30-day notice)
    function initiateTermination() external {
        require(msg.sender == landlord, "Only landlord");
        require(state == State.Active, "Not active");
        terminationNoticeTime = block.timestamp;
        state = State.TerminationPending;
    }

    function finalizeTermination() external {
        require(state == State.TerminationPending, "Not pending");
        require(block.timestamp >= terminationNoticeTime + 30 days, "Notice period");

        // Pro-rata refund
        uint256 monthsElapsed = (block.timestamp - startTime) / 30 days;
        uint256 owedToLandlord = monthsElapsed * monthlyAmount;

        if (owedToLandlord > totalPaid) {
            USDC.transfer(landlord, owedToLandlord - totalPaid);
        }

        uint256 refund = USDC.balanceOf(address(this));
        if (refund > 0) {
            USDC.transfer(tenant, refund);
        }

        state = State.Terminated;
    }
}
```

### 4.3 Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Proxy pattern | OpenZeppelin Clones (EIP-1167) | Gas efficient, audited |
| Salt generation | `keccak256(userAddress, suggestedName)` | Prevents collisions across users |
| Activation | Balance-based (`balanceOf` check) | Handles async bridge funding |
| Rent release | Permissionless | Anyone can trigger, no keeper needed |
| Early termination | 30-day notice + pro-rata | Fair to both parties |
| Token | USDC only (hardcoded) | Simplifies hackathon scope |

---

## 5. Frontend Architecture

### 5.1 Project Structure

```
civitas/
├── app/
│   ├── layout.tsx                  # Root + Web3Provider
│   ├── page.tsx                    # Landing
│   ├── create/page.tsx             # Split-screen chat
│   ├── dashboard/page.tsx          # Contract list (SSR)
│   ├── contract/[address]/page.tsx # Contract details
│   └── api/
│       ├── chat/route.ts           # Streaming AI
│       ├── extract-config/route.ts # Structured extraction
│       └── generate-name/route.ts  # Basename generation
├── components/
│   ├── providers/Web3Provider.tsx  # RainbowKit setup
│   ├── chat/ChatInterface.tsx      # Streaming chat
│   ├── contract/ContractCard.tsx   # Real-time preview
│   ├── deploy/
│   │   ├── DeployModal.tsx         # Orchestrates flow
│   │   ├── LiFiBridgeStep.tsx      # Widget + events
│   │   └── LiFiEventHandler.tsx    # useWidgetEvents
│   └── dashboard/
│       ├── DashboardClient.tsx     # Filtering
│       └── ContractCard.tsx        # Preview cards
├── hooks/
│   ├── useRentalChat.ts            # AI + config extraction
│   ├── useContractDeploy.ts        # Deploy orchestration
│   └── useFundsArrival.ts          # Balance polling
└── lib/
    ├── ai/schemas.ts               # Zod schemas
    ├── contracts/
    │   ├── constants.ts            # Addresses, ABIs
    │   ├── predict-address.ts      # CREATE2 calculation
    │   └── fetch-contracts.ts      # Server-side reads
    ├── ens/resolver.ts             # ENS/Basename resolution
    └── lifi/widget-config.ts       # LI.FI configuration
```

### 5.2 Key Components

#### Web3 Provider (RainbowKit v2)
```tsx
// components/providers/Web3Provider.tsx
'use client';

import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { base, arbitrum, optimism } from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

const config = getDefaultConfig({
  appName: 'Civitas',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  chains: [base, arbitrum, optimism],
  ssr: true,
});

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

#### LI.FI Widget Integration
```tsx
// components/deploy/LiFiBridgeStep.tsx
'use client';

import { WidgetProvider } from '@lifi/widget';
import { LiFiWidgetWrapper } from './LiFiWidgetWrapper';
import { LiFiEventHandler } from './LiFiEventHandler';

export function LiFiBridgeStep({
  destinationAddress,
  requiredAmount,
  onBridgeStarted,
  onBridgeCompleted,
}: Props) {
  return (
    <WidgetProvider>
      <LiFiEventHandler
        onRouteStarted={(route) => {
          const txHash = route.steps?.[0]?.execution?.process?.[0]?.txHash;
          if (txHash) onBridgeStarted(txHash);
        }}
        onRouteCompleted={onBridgeCompleted}
      />
      <LiFiWidgetWrapper
        destinationAddress={destinationAddress}
        requiredAmount={requiredAmount}
      />
    </WidgetProvider>
  );
}
```

---

## 6. AI Layer

### 6.1 Model Configuration

| Component | Model | Cost |
|-----------|-------|------|
| Chat streaming | `gemini-3-flash-preview` | $0.50/1M input |
| Config extraction | `gemini-3-flash-preview` | $3.00/1M output |
| Name generation | `gemini-3-flash-preview` | $3.00/1M output |

### 6.2 Schemas (Zod)

```ts
// lib/ai/schemas.ts
import { z } from 'zod';

export const RentalConfigSchema = z.object({
  tenant: z.string().describe('ENS name or Ethereum address'),
  monthlyAmount: z.number().positive().describe('Monthly rent in USDC'),
  totalMonths: z.number().int().min(1).max(60).describe('Duration'),
  needsClarification: z.boolean().optional(),
  clarificationQuestion: z.string().optional(),
});

export const NameSuggestionSchema = z.object({
  suggestedName: z.string().max(20).describe('Semantic subdomain name'),
});
```

### 6.3 Streaming Chat API

```ts
// app/api/chat/route.ts
import { streamText } from 'ai';
import { google } from '@ai-sdk/google';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: google('gemini-3-flash-preview'),
    system: RENTAL_ASSISTANT_PROMPT,
    messages,
  });

  return result.toTextStreamResponse();
}
```

---

## 7. Deployment Flow (Sign & Fund)

### 7.1 Sequence

```
User clicks "Sign & Fund"
         │
         ▼
┌─────────────────────────────────┐
│ 1. Calculate CREATE2 address    │
│    salt = keccak256(user, name) │
│    address = predictAddress()   │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 2. User signs Tx #1             │
│    Factory.deployRental()       │
│    Contract now exists on Base  │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 3. LI.FI Widget appears         │
│    Destination: predicted addr  │
│    User selects source token    │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 4. User signs Tx #2             │
│    LI.FI bridges funds          │
│    (1-5 minutes)                │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 5. Poll balanceOf()             │
│    When balance >= required:    │
│    Contract activates           │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 6. Success!                     │
│    Confetti + Basename live     │
└─────────────────────────────────┘
```

### 7.2 CREATE2 Address Prediction

```ts
// lib/contracts/predict-address.ts
import { keccak256, encodePacked, getContractAddress } from 'viem';

export function predictRentalAddress(
  userAddress: `0x${string}`,
  suggestedName: string
): `0x${string}` {
  const salt = keccak256(
    encodePacked(['address', 'string'], [userAddress, suggestedName])
  );

  const bytecodeHash = getProxyBytecodeHash(); // EIP-1167

  return getContractAddress({
    bytecodeHash,
    from: FACTORY_ADDRESS,
    opcode: 'CREATE2',
    salt,
  });
}
```

---

## 8. Dashboard & Contract Management

### 8.1 Contract Statuses

| Status | Emoji | Meaning |
|--------|-------|---------|
| Ghost | 🔴 | Deployed but not funded |
| Pending Funds | 🟡 | Partial funding |
| Active | 🟢 | Running normally |
| Payment Due | 🟠 | Rent ready to release |
| Terminating | 🟣 | In 30-day notice period |
| Completed | ✅ | Successfully finished |
| Terminated | ⚫ | Early termination complete |

### 8.2 Dashboard Features

- **Filter by status:** All / Active / Pending / Completed
- **Filter by role:** All / As Landlord / As Tenant
- **Contract cards:** Show status, progress bar, action prompts
- **Contract details:** Full terms, payment history, actions

### 8.3 Available Actions

| Action | Who | When |
|--------|-----|------|
| Release Pending Rent | Anyone | Payment due |
| Initiate Termination | Landlord | Active contract |
| Finalize Termination | Anyone | After 30-day notice |

---

## 9. Key Technical Decisions

### 9.1 Why Balance-Based Activation?

**Problem:** LI.FI bridge transactions are async (1-5 min). If we require a specific `deposit()` function call, funds could arrive but activation could fail.

**Solution:** Contract checks `USDC.balanceOf(address(this)) >= required`. Doesn't matter HOW funds arrived - direct transfer, LI.FI bridge, or even airdrop.

### 9.2 Why Salt = User + Name?

**Problem:** If two users both want `"downtown-studio"`, salt collision → deployment reverts.

**Solution:** Salt includes user address: `keccak256(userAddress, suggestedName)`. Alice's `downtown-studio` and Bob's `downtown-studio` deploy to different addresses.

### 9.3 Why Gemini 3 Flash?

- **Speed:** Flash-level latency for real-time chat
- **Cost:** $0.50 input / $3.00 output per 1M tokens
- **Structured Output:** Supports Zod schemas via Vercel AI SDK
- **Context:** 1M token window handles long conversations

---

## 10. Future Roadmap

### Phase 2: Full R2F2C (AI-Generated FSM)

Currently, the FSM is hardcoded in `RecurringRent.sol`. Future versions will:
1. AI generates state machine as JSON
2. Backend validates for deadlocks
3. Factory deploys from template library based on FSM

### Phase 3: Additional Templates

- **Escrow** - Simple two-party with arbiter
- **Payment Splitter** - Multi-party revenue share
- **Bet/Wager** - Conditional payout based on oracle

### Phase 4: Production Hardening

- Account abstraction for single-signature flows
- Gas sponsorship for better UX
- Subgraph for efficient contract indexing
- Multi-chain deployment (not just Base)

---

## 11. Environment Variables

```env
# .env.local

# AI
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key

# Wallet
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# RPC
BASE_RPC_URL=https://mainnet.base.org
MAINNET_RPC_URL=https://eth.llamarpc.com

# Contracts (after deployment)
NEXT_PUBLIC_FACTORY_ADDRESS=0x...
NEXT_PUBLIC_RENTAL_IMPLEMENTATION=0x...
```

---

## 12. Development Checklist

### Smart Contracts
- [ ] Implement RentalFactory.sol
- [ ] Implement RecurringRent.sol
- [ ] Write Foundry tests
- [ ] Deploy to Base Sepolia (testnet)
- [ ] Deploy to Base Mainnet
- [ ] Register civitas.base.eth

### Frontend
- [ ] Set up Next.js 15 project
- [ ] Configure RainbowKit + wagmi
- [ ] Build chat interface with streaming
- [ ] Build contract card component
- [ ] Integrate LI.FI widget
- [ ] Build deploy modal flow
- [ ] Build dashboard
- [ ] Build contract detail page

### AI
- [ ] Configure Gemini 3 Flash
- [ ] Implement streaming chat API
- [ ] Implement config extraction
- [ ] Implement name generation
- [ ] Test ENS resolution

### Integration Testing
- [ ] End-to-end flow on testnet
- [ ] Cross-chain funding test (Arbitrum → Base)
- [ ] Basename registration test
- [ ] Edge cases (partial funding, etc.)

---

## 13. Demo Script (3 minutes)

1. **Opening (10s):** "Civitas - chat with a legal assistant, not a blockchain"
2. **Chat Demo (45s):** Type rental terms, show real-time contract card
3. **Sign & Fund (60s):** Click button, sign deploy tx, show LI.FI widget, bridge from Arbitrum
4. **Success (30s):** Show confetti, basename live, contract on BaseScan
5. **Dashboard (30s):** Show contract list, status indicators, release rent action
6. **Closing (15s):** Recap the three pillars - Logic, Liquidity, Identity

---

## 14. References

### Documentation
- [LI.FI Widget Docs](https://docs.li.fi/)
- [ENS Docs](https://docs.ens.domains/)
- [Base Docs](https://docs.base.org/)
- [Vercel AI SDK](https://ai-sdk.dev/)
- [wagmi v2](https://wagmi.sh/)
- [viem](https://viem.sh/)
- [OpenZeppelin Clones](https://docs.openzeppelin.com/contracts/5.x/api/proxy#Clones)

### Contract Addresses
- **Base USDC:** `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **Base Chain ID:** `8453`

---

*Document generated during Civitas brainstorming session, 2026-02-01*
