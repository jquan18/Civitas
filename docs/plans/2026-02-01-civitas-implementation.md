# Civitas Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an AI-powered cross-chain rental agreement platform that lets users chat to create contracts, deploy them to Base, and fund them from any chain using LI.FI.

**Architecture:** Next.js 15 frontend with Gemini AI for chat, Foundry smart contracts using CREATE2 + EIP-1167 proxies, RainbowKit for wallet connection, LI.FI widget for cross-chain funding, and Basenames for human-readable contract addresses.

**Tech Stack:** Next.js 15, TypeScript, Solidity 0.8.20, Foundry, Gemini 3 Flash, Vercel AI SDK, RainbowKit v2, wagmi v2, viem, LI.FI Widget, Tailwind CSS

---

## Phase 1: Project Setup & Foundation

### Task 1: Initialize Next.js Project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.js`
- Create: `tailwind.config.ts`
- Create: `.env.local.example`

**Step 1: Create Next.js 15 project**

```bash
npx create-next-app@latest civitas --typescript --tailwind --app --no-src-dir --import-alias "@/*"
cd civitas
```

Expected: Project created with App Router

**Step 2: Install core dependencies**

```bash
npm install @rainbow-me/rainbowkit@^2.0.0 wagmi@^2.0.0 viem@^2.0.0 @tanstack/react-query
npm install ai @ai-sdk/google zod
npm install @lifi/widget
npm install -D @types/node @types/react @types/react-dom
```

Expected: All packages installed successfully

**Step 3: Create environment template**

Create `.env.local.example`:
```env
# AI
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key

# Wallet
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# RPC
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
NEXT_PUBLIC_MAINNET_RPC_URL=https://eth.llamarpc.com

# Contracts (after deployment)
NEXT_PUBLIC_FACTORY_ADDRESS=
NEXT_PUBLIC_RENTAL_IMPLEMENTATION=
```

**Step 4: Create .env.local**

```bash
cp .env.local.example .env.local
```

Expected: File created (user will add keys later)

**Step 5: Commit setup**

```bash
git add .
git commit -m "feat: initialize Next.js 15 project with core dependencies"
```

---

### Task 2: Configure Web3 Provider

**Files:**
- Create: `components/providers/Web3Provider.tsx`
- Modify: `app/layout.tsx`

**Step 1: Write Web3Provider component**

Create `components/providers/Web3Provider.tsx`:
```tsx
'use client';

import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { base, arbitrum, optimism } from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import '@rainbow-me/rainbowkit/styles.css';

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

**Step 2: Update root layout**

Modify `app/layout.tsx`:
```tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Web3Provider } from '@/components/providers/Web3Provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Civitas - AI-Powered Cross-Chain Rental Agreements',
  description: 'Chat with AI to create, deploy, and fund rental agreements on Base',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Web3Provider>{children}</Web3Provider>
      </body>
    </html>
  );
}
```

**Step 3: Test provider renders**

Run: `npm run dev`
Expected: App starts on http://localhost:3000

**Step 4: Commit provider setup**

```bash
git add components/providers/Web3Provider.tsx app/layout.tsx
git commit -m "feat: add RainbowKit Web3 provider configuration"
```

---

## Phase 2: Smart Contracts

### Task 3: Setup Foundry Project

**Files:**
- Create: `contracts/foundry.toml`
- Create: `contracts/script/Deploy.s.sol`
- Create: `contracts/.gitignore`

**Step 1: Initialize Foundry**

```bash
mkdir contracts
cd contracts
forge init --no-commit
cd ..
```

Expected: Foundry project created in contracts/

**Step 2: Configure Foundry**

Create `contracts/foundry.toml`:
```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc_version = "0.8.20"
optimizer = true
optimizer_runs = 200

[rpc_endpoints]
base = "${NEXT_PUBLIC_BASE_RPC_URL}"
base_sepolia = "https://sepolia.base.org"
```

**Step 3: Install OpenZeppelin**

```bash
cd contracts
forge install OpenZeppelin/openzeppelin-contracts@v5.0.0 --no-commit
cd ..
```

Expected: OpenZeppelin installed in contracts/lib/

**Step 4: Update remappings**

Create `contracts/remappings.txt`:
```
@openzeppelin/=lib/openzeppelin-contracts/
```

**Step 5: Commit Foundry setup**

```bash
git add contracts/
git commit -m "feat: initialize Foundry project with OpenZeppelin"
```

---

### Task 4: Implement RecurringRent Contract

**Files:**
- Create: `contracts/src/RecurringRent.sol`
- Create: `contracts/test/RecurringRent.t.sol`

**Step 1: Write failing test**

Create `contracts/test/RecurringRent.t.sol`:
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/RecurringRent.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {
        _mint(msg.sender, 1000000 * 10**6);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

contract RecurringRentTest is Test {
    RecurringRent public rental;
    MockUSDC public usdc;
    address public landlord = address(0x1);
    address public tenant = address(0x2);
    uint256 public monthlyAmount = 1000 * 10**6; // 1000 USDC
    uint8 public totalMonths = 6;

    function setUp() public {
        usdc = new MockUSDC();
        rental = new RecurringRent();
        rental.initialize(landlord, tenant, monthlyAmount, totalMonths);
    }

    function testInitialization() public {
        assertEq(rental.landlord(), landlord);
        assertEq(rental.tenant(), tenant);
        assertEq(rental.monthlyAmount(), monthlyAmount);
        assertEq(rental.totalMonths(), totalMonths);
        assertTrue(rental.state() == RecurringRent.State.Deployed);
    }
}
```

**Step 2: Run test to verify it fails**

```bash
cd contracts
forge test --match-test testInitialization -vv
```

Expected: FAIL with "RecurringRent.sol not found"

**Step 3: Write minimal RecurringRent implementation**

Create `contracts/src/RecurringRent.sol`:
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

    event ContractActivated(uint256 startTime);
    event RentReleased(uint256 amount, uint256 totalPaid);
    event TerminationInitiated(uint256 noticeTime);
    event ContractTerminated(uint256 refundAmount);

    function initialize(
        address _landlord,
        address _tenant,
        uint256 _monthlyAmount,
        uint8 _totalMonths
    ) external initializer {
        require(_landlord != address(0), "Invalid landlord");
        require(_tenant != address(0), "Invalid tenant");
        require(_monthlyAmount > 0, "Invalid amount");
        require(_totalMonths > 0 && _totalMonths <= 60, "Invalid duration");

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
            emit ContractActivated(startTime);
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

        emit RentReleased(toPay, totalPaid);

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
        emit TerminationInitiated(terminationNoticeTime);
    }

    function finalizeTermination() external {
        require(state == State.TerminationPending, "Not pending");
        require(block.timestamp >= terminationNoticeTime + 30 days, "Notice period");

        // Pro-rata refund
        uint256 monthsElapsed = (block.timestamp - startTime) / 30 days;
        uint256 owedToLandlord = monthsElapsed * monthlyAmount;

        if (owedToLandlord > totalPaid) {
            uint256 payment = owedToLandlord - totalPaid;
            totalPaid += payment;
            USDC.transfer(landlord, payment);
        }

        uint256 refund = USDC.balanceOf(address(this));
        if (refund > 0) {
            USDC.transfer(tenant, refund);
        }

        state = State.Terminated;
        emit ContractTerminated(refund);
    }
}
```

**Step 4: Run test to verify it passes**

```bash
forge test --match-test testInitialization -vv
```

Expected: PASS

**Step 5: Commit RecurringRent contract**

```bash
git add contracts/src/RecurringRent.sol contracts/test/RecurringRent.t.sol
git commit -m "feat: implement RecurringRent contract with balance-based activation"
```

---

### Task 5: Add Comprehensive RecurringRent Tests

**Files:**
- Modify: `contracts/test/RecurringRent.t.sol`

**Step 1: Write activation test**

Add to `contracts/test/RecurringRent.t.sol`:
```solidity
function testActivationWhenFunded() public {
    // Transfer full amount
    uint256 totalRequired = monthlyAmount * totalMonths;
    usdc.transfer(address(rental), totalRequired);

    // Check and activate
    rental.checkAndActivate();

    assertTrue(rental.state() == RecurringRent.State.Active);
    assertGt(rental.startTime(), 0);
}

function testNoActivationWhenPartiallyFunded() public {
    // Transfer partial amount
    usdc.transfer(address(rental), monthlyAmount * 3);

    rental.checkAndActivate();

    assertTrue(rental.state() == RecurringRent.State.Deployed);
}
```

**Step 2: Run activation tests**

```bash
forge test --match-test testActivation -vv
```

Expected: PASS (2 tests)

**Step 3: Write rent release test**

Add to test file:
```solidity
function testReleaseRentAfterOneMonth() public {
    // Setup: fund and activate
    uint256 totalRequired = monthlyAmount * totalMonths;
    usdc.transfer(address(rental), totalRequired);
    rental.checkAndActivate();

    // Warp 1 month
    vm.warp(block.timestamp + 30 days);

    // Release rent
    uint256 landlordBalBefore = usdc.balanceOf(landlord);
    rental.releasePendingRent();
    uint256 landlordBalAfter = usdc.balanceOf(landlord);

    assertEq(landlordBalAfter - landlordBalBefore, monthlyAmount);
    assertEq(rental.totalPaid(), monthlyAmount);
}

function testReleaseMultipleMonths() public {
    // Setup
    uint256 totalRequired = monthlyAmount * totalMonths;
    usdc.transfer(address(rental), totalRequired);
    rental.checkAndActivate();

    // Warp 3 months
    vm.warp(block.timestamp + 90 days);

    rental.releasePendingRent();

    assertEq(rental.totalPaid(), monthlyAmount * 3);
}
```

**Step 4: Run rent release tests**

```bash
forge test --match-test testRelease -vv
```

Expected: PASS (2 tests)

**Step 5: Write termination tests**

Add to test file:
```solidity
function testInitiateTermination() public {
    // Setup
    uint256 totalRequired = monthlyAmount * totalMonths;
    usdc.transfer(address(rental), totalRequired);
    rental.checkAndActivate();

    // Landlord initiates
    vm.prank(landlord);
    rental.initiateTermination();

    assertTrue(rental.state() == RecurringRent.State.TerminationPending);
    assertGt(rental.terminationNoticeTime(), 0);
}

function testFinalizeTermination() public {
    // Setup and initiate
    uint256 totalRequired = monthlyAmount * totalMonths;
    usdc.transfer(address(rental), totalRequired);
    rental.checkAndActivate();

    vm.prank(landlord);
    rental.initiateTermination();

    // Warp 30 days
    vm.warp(block.timestamp + 30 days);

    // Finalize
    uint256 tenantBalBefore = usdc.balanceOf(tenant);
    rental.finalizeTermination();
    uint256 tenantBalAfter = usdc.balanceOf(tenant);

    assertTrue(rental.state() == RecurringRent.State.Terminated);
    assertEq(tenantBalAfter - tenantBalBefore, totalRequired); // Full refund (no time elapsed)
}
```

**Step 6: Run all tests**

```bash
forge test -vv
```

Expected: All tests PASS

**Step 7: Commit tests**

```bash
git add contracts/test/RecurringRent.t.sol
git commit -m "test: add comprehensive RecurringRent tests"
```

---

### Task 6: Implement RentalFactory Contract

**Files:**
- Create: `contracts/src/RentalFactory.sol`
- Create: `contracts/test/RentalFactory.t.sol`

**Step 1: Write failing factory test**

Create `contracts/test/RentalFactory.t.sol`:
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/RentalFactory.sol";
import "../src/RecurringRent.sol";

contract RentalFactoryTest is Test {
    RentalFactory public factory;
    RecurringRent public implementation;

    address public landlord = address(0x1);
    address public tenant = address(0x2);
    uint256 public monthlyAmount = 1000 * 10**6;
    uint8 public totalMonths = 6;

    function setUp() public {
        implementation = new RecurringRent();
        factory = new RentalFactory(address(implementation));
    }

    function testDeployRental() public {
        address predicted = factory.predictRentalAddress(address(this), "downtown-studio");

        address deployed = factory.deployRental(
            landlord,
            tenant,
            monthlyAmount,
            totalMonths,
            "downtown-studio"
        );

        assertEq(deployed, predicted);

        RecurringRent rental = RecurringRent(deployed);
        assertEq(rental.landlord(), landlord);
        assertEq(rental.tenant(), tenant);
    }
}
```

**Step 2: Run test to verify it fails**

```bash
forge test --match-test testDeployRental -vv
```

Expected: FAIL with "RentalFactory.sol not found"

**Step 3: Write RentalFactory implementation**

Create `contracts/src/RentalFactory.sol`:
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./RecurringRent.sol";

contract RentalFactory is Ownable {
    using Clones for address;

    address public immutable implementation;
    mapping(bytes32 => address) public authorizedDeployments;

    event RentalDeployed(
        address indexed creator,
        address indexed rental,
        address indexed landlord,
        address tenant,
        string suggestedName
    );

    constructor(address _implementation) Ownable(msg.sender) {
        require(_implementation != address(0), "Invalid implementation");
        implementation = _implementation;
    }

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

        delete authorizedDeployments[salt];

        emit RentalDeployed(msg.sender, rental, landlord, tenant, suggestedName);
    }

    function predictRentalAddress(
        address deployer,
        string calldata suggestedName
    ) external view returns (address) {
        bytes32 salt = keccak256(abi.encode(deployer, suggestedName));
        return implementation.predictDeterministicAddress(salt, address(this));
    }

    function authorizeDeployment(bytes32 salt, address deployer) external onlyOwner {
        authorizedDeployments[salt] = deployer;
    }
}
```

**Step 4: Run test to verify it passes**

```bash
forge test --match-test testDeployRental -vv
```

Expected: PASS

**Step 5: Add CREATE2 prediction test**

Add to `contracts/test/RentalFactory.t.sol`:
```solidity
function testPredictedAddressMatches() public {
    address predicted = factory.predictRentalAddress(address(this), "test-rental");

    address deployed = factory.deployRental(
        landlord,
        tenant,
        monthlyAmount,
        totalMonths,
        "test-rental"
    );

    assertEq(deployed, predicted, "Deployed address must match prediction");
}

function testDifferentUsersGetDifferentAddresses() public {
    address user1Prediction = factory.predictRentalAddress(address(0x100), "same-name");

    vm.prank(address(0x200));
    address user2Prediction = factory.predictRentalAddress(address(0x200), "same-name");

    assertTrue(user1Prediction != user2Prediction, "Different users should get different addresses");
}
```

**Step 6: Run all factory tests**

```bash
forge test --match-contract RentalFactory -vv
```

Expected: All tests PASS

**Step 7: Commit factory**

```bash
git add contracts/src/RentalFactory.sol contracts/test/RentalFactory.t.sol
git commit -m "feat: implement RentalFactory with CREATE2 deployment"
```

---

### Task 7: Deploy Contracts to Base Sepolia

**Files:**
- Create: `contracts/script/Deploy.s.sol`
- Create: `contracts/.env.example`

**Step 1: Write deployment script**

Create `contracts/script/Deploy.s.sol`:
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/RecurringRent.sol";
import "../src/RentalFactory.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy implementation
        RecurringRent implementation = new RecurringRent();
        console.log("Implementation deployed to:", address(implementation));

        // Deploy factory
        RentalFactory factory = new RentalFactory(address(implementation));
        console.log("Factory deployed to:", address(factory));

        vm.stopBroadcast();
    }
}
```

**Step 2: Create environment template**

Create `contracts/.env.example`:
```env
PRIVATE_KEY=your_private_key_here
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASESCAN_API_KEY=your_basescan_api_key
```

**Step 3: Deploy to Base Sepolia**

```bash
cd contracts
source .env
forge script script/Deploy.s.sol --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast --verify
```

Expected: Contracts deployed with addresses printed

**Step 4: Save deployment addresses**

Note the addresses and update `.env.local`:
```
NEXT_PUBLIC_FACTORY_ADDRESS=0x...
NEXT_PUBLIC_RENTAL_IMPLEMENTATION=0x...
```

**Step 5: Commit deployment script**

```bash
git add contracts/script/Deploy.s.sol contracts/.env.example
git commit -m "feat: add deployment script for Base Sepolia"
```

---

## Phase 3: AI Layer

### Task 8: Create AI Schemas

**Files:**
- Create: `lib/ai/schemas.ts`
- Create: `lib/ai/prompts.ts`

**Step 1: Write Zod schemas**

Create `lib/ai/schemas.ts`:
```typescript
import { z } from 'zod';

export const RentalConfigSchema = z.object({
  tenant: z.string().describe('ENS name or Ethereum address'),
  monthlyAmount: z.number().positive().describe('Monthly rent in USDC'),
  totalMonths: z.number().int().min(1).max(60).describe('Duration in months'),
  needsClarification: z.boolean().optional().describe('Whether AI needs more info'),
  clarificationQuestion: z.string().optional().describe('Question to ask user'),
});

export type RentalConfig = z.infer<typeof RentalConfigSchema>;

export const NameSuggestionSchema = z.object({
  suggestedName: z.string().max(20).describe('Semantic subdomain name (lowercase, hyphenated)'),
  reasoning: z.string().optional().describe('Why this name was chosen'),
});

export type NameSuggestion = z.infer<typeof NameSuggestionSchema>;
```

**Step 2: Write AI prompts**

Create `lib/ai/prompts.ts`:
```typescript
export const RENTAL_ASSISTANT_PROMPT = `You are a helpful AI assistant for Civitas, a platform that creates rental agreements on the blockchain.

Your job is to help users define rental agreement terms through natural conversation.

Key information to extract:
- Tenant: ENS name (like "bob.eth") or Ethereum address (0x...)
- Monthly amount: In USDC (e.g., 1000 USDC)
- Duration: Number of months (1-60)

Be conversational and ask clarifying questions if needed. Examples:
- "Who will be renting from you?"
- "How much rent per month?"
- "How long is the rental period?"

Always confirm the details before finalizing.`;

export const CONFIG_EXTRACTION_PROMPT = `Extract rental agreement configuration from the conversation.

If any required fields are missing or unclear, set needsClarification=true and provide a clarificationQuestion.

Required fields:
- tenant (ENS name or address)
- monthlyAmount (USDC)
- totalMonths (1-60)`;

export const NAME_GENERATION_PROMPT = `Generate a semantic, memorable subdomain name for this rental agreement.

Guidelines:
- Lowercase, hyphenated format (e.g., "downtown-studio-6mo")
- Max 20 characters
- Include location or property type if mentioned
- Include duration if helpful
- Make it human-readable

Example: For "1BR apartment in downtown Seattle for 12 months" → "seattle-1br-12mo"`;
```

**Step 3: Commit AI schemas**

```bash
git add lib/ai/schemas.ts lib/ai/prompts.ts
git commit -m "feat: add AI schemas and prompts for rental config extraction"
```

---

### Task 9: Implement Streaming Chat API

**Files:**
- Create: `app/api/chat/route.ts`
- Create: `app/api/extract-config/route.ts`
- Create: `app/api/generate-name/route.ts`

**Step 1: Write streaming chat endpoint**

Create `app/api/chat/route.ts`:
```typescript
import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { RENTAL_ASSISTANT_PROMPT } from '@/lib/ai/prompts';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const result = streamText({
      model: google('gemini-3-flash-preview'),
      system: RENTAL_ASSISTANT_PROMPT,
      messages,
      temperature: 0.7,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
```

**Step 2: Write config extraction endpoint**

Create `app/api/extract-config/route.ts`:
```typescript
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { RentalConfigSchema } from '@/lib/ai/schemas';
import { CONFIG_EXTRACTION_PROMPT } from '@/lib/ai/prompts';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const { object } = await generateObject({
      model: google('gemini-3-flash-preview'),
      schema: RentalConfigSchema,
      system: CONFIG_EXTRACTION_PROMPT,
      messages,
    });

    return Response.json(object);
  } catch (error) {
    console.error('Config extraction error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
```

**Step 3: Write name generation endpoint**

Create `app/api/generate-name/route.ts`:
```typescript
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { NameSuggestionSchema } from '@/lib/ai/schemas';
import { NAME_GENERATION_PROMPT } from '@/lib/ai/prompts';

export async function POST(req: Request) {
  try {
    const { config } = await req.json();

    const { object } = await generateObject({
      model: google('gemini-3-flash-preview'),
      schema: NameSuggestionSchema,
      system: NAME_GENERATION_PROMPT,
      prompt: `Generate a subdomain name for this rental:
Tenant: ${config.tenant}
Monthly amount: ${config.monthlyAmount} USDC
Duration: ${config.totalMonths} months`,
    });

    return Response.json(object);
  } catch (error) {
    console.error('Name generation error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
```

**Step 4: Test chat endpoint**

```bash
npm run dev
# Use curl or Postman to test /api/chat
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"I want to rent my apartment"}]}'
```

Expected: Streaming response with AI message

**Step 5: Commit API routes**

```bash
git add app/api/
git commit -m "feat: implement AI chat and extraction API endpoints"
```

---

## Phase 4: Frontend Components

### Task 10: Create Contract Constants

**Files:**
- Create: `lib/contracts/constants.ts`
- Create: `lib/contracts/abis.ts`

**Step 1: Write contract constants**

Create `lib/contracts/constants.ts`:
```typescript
import { base, baseSepolia } from 'viem/chains';

export const CONTRACTS = {
  [base.id]: {
    factory: process.env.NEXT_PUBLIC_FACTORY_ADDRESS as `0x${string}`,
    implementation: process.env.NEXT_PUBLIC_RENTAL_IMPLEMENTATION as `0x${string}`,
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`,
  },
  [baseSepolia.id]: {
    factory: process.env.NEXT_PUBLIC_FACTORY_ADDRESS as `0x${string}`,
    implementation: process.env.NEXT_PUBLIC_RENTAL_IMPLEMENTATION as `0x${string}`,
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`, // Sepolia USDC
  },
} as const;

export const SUPPORTED_CHAINS = [base, baseSepolia] as const;

export function getContracts(chainId: number) {
  const contracts = CONTRACTS[chainId as keyof typeof CONTRACTS];
  if (!contracts) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  return contracts;
}
```

**Step 2: Export ABIs**

Create `lib/contracts/abis.ts`:
```typescript
export const RENTAL_FACTORY_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "landlord", "type": "address" },
      { "internalType": "address", "name": "tenant", "type": "address" },
      { "internalType": "uint256", "name": "monthlyAmount", "type": "uint256" },
      { "internalType": "uint8", "name": "totalMonths", "type": "uint8" },
      { "internalType": "string", "name": "suggestedName", "type": "string" }
    ],
    "name": "deployRental",
    "outputs": [{ "internalType": "address", "name": "rental", "type": "address" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "deployer", "type": "address" },
      { "internalType": "string", "name": "suggestedName", "type": "string" }
    ],
    "name": "predictRentalAddress",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export const RECURRING_RENT_ABI = [
  {
    "inputs": [],
    "name": "landlord",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "tenant",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "monthlyAmount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalMonths",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "state",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "checkAndActivate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "releasePendingRent",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

export const ERC20_ABI = [
  {
    "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const;
```

**Step 3: Commit contract constants**

```bash
git add lib/contracts/
git commit -m "feat: add contract constants and ABIs"
```

---

### Task 11: Create Chat Interface

**Files:**
- Create: `components/chat/ChatInterface.tsx`
- Create: `hooks/useRentalChat.ts`

**Step 1: Write chat hook**

Create `hooks/useRentalChat.ts`:
```typescript
'use client';

import { useChat } from 'ai/react';
import { useEffect, useState } from 'react';
import { RentalConfig } from '@/lib/ai/schemas';

export function useRentalChat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
  });

  const [config, setConfig] = useState<RentalConfig | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  async function extractConfig() {
    if (messages.length === 0) return;

    setIsExtracting(true);
    try {
      const response = await fetch('/api/extract-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      });

      const extracted = await response.json();

      if (!extracted.needsClarification) {
        setConfig(extracted);
      }
    } catch (error) {
      console.error('Failed to extract config:', error);
    } finally {
      setIsExtracting(false);
    }
  }

  // Auto-extract after each assistant message
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'assistant') {
      extractConfig();
    }
  }, [messages]);

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    config,
    isExtracting,
  };
}
```

**Step 2: Write chat component**

Create `components/chat/ChatInterface.tsx`:
```typescript
'use client';

import { useRentalChat } from '@/hooks/useRentalChat';

export function ChatInterface() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useRentalChat();

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="Describe your rental agreement..."
            className="flex-1 rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
```

**Step 3: Test chat interface**

```bash
npm run dev
# Visit http://localhost:3000 and test chat
```

Expected: Chat interface renders and streams responses

**Step 4: Commit chat interface**

```bash
git add components/chat/ hooks/useRentalChat.ts
git commit -m "feat: add streaming chat interface with config extraction"
```

---

### Task 12: Create Contract Card Component

**Files:**
- Create: `components/contract/ContractCard.tsx`

**Step 1: Write ContractCard component**

Create `components/contract/ContractCard.tsx`:
```typescript
'use client';

import { RentalConfig } from '@/lib/ai/schemas';
import { formatUnits } from 'viem';

interface ContractCardProps {
  config: RentalConfig | null;
  isLoading?: boolean;
}

export function ContractCard({ config, isLoading }: ContractCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded w-5/6" />
          <div className="h-4 bg-gray-200 rounded w-4/6" />
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
        <div className="text-gray-400 mb-2">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-gray-500">Start chatting to create your rental agreement</p>
      </div>
    );
  }

  const totalAmount = config.monthlyAmount * config.totalMonths;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
      <h3 className="text-lg font-semibold mb-4">Rental Agreement Preview</h3>

      <div className="space-y-3">
        <div className="flex justify-between py-2 border-b">
          <span className="text-gray-600">Tenant</span>
          <span className="font-mono text-sm">{config.tenant}</span>
        </div>

        <div className="flex justify-between py-2 border-b">
          <span className="text-gray-600">Monthly Rent</span>
          <span className="font-semibold">{config.monthlyAmount.toLocaleString()} USDC</span>
        </div>

        <div className="flex justify-between py-2 border-b">
          <span className="text-gray-600">Duration</span>
          <span className="font-semibold">{config.totalMonths} months</span>
        </div>

        <div className="flex justify-between py-2 bg-blue-50 -mx-6 px-6 mt-4">
          <span className="text-gray-900 font-semibold">Total Amount</span>
          <span className="font-bold text-blue-600">{totalAmount.toLocaleString()} USDC</span>
        </div>
      </div>

      <button
        className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
      >
        Sign & Fund Contract
      </button>
    </div>
  );
}
```

**Step 2: Commit contract card**

```bash
git add components/contract/ContractCard.tsx
git commit -m "feat: add contract preview card component"
```

---

### Task 13: Create Split-Screen Create Page

**Files:**
- Create: `app/create/page.tsx`

**Step 1: Write create page**

Create `app/create/page.tsx`:
```typescript
'use client';

import { ChatInterface } from '@/components/chat/ChatInterface';
import { ContractCard } from '@/components/contract/ContractCard';
import { useRentalChat } from '@/hooks/useRentalChat';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function CreatePage() {
  const { config, isExtracting } = useRentalChat();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Civitas</h1>
          <ConnectButton />
        </div>
      </header>

      {/* Split Screen */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-8rem)]">
          {/* Left: Chat */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
              <h2 className="text-xl font-semibold text-white">Describe Your Agreement</h2>
              <p className="text-blue-100 text-sm mt-1">Chat with AI to create your rental contract</p>
            </div>
            <div className="h-[calc(100%-5rem)]">
              <ChatInterface />
            </div>
          </div>

          {/* Right: Contract Preview */}
          <div>
            <div className="sticky top-8">
              <ContractCard config={config} isLoading={isExtracting} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Update landing page to link to create**

Modify `app/page.tsx`:
```typescript
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800">
      <div className="absolute top-4 right-4">
        <ConnectButton />
      </div>

      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <h1 className="text-6xl font-bold text-white mb-4 text-center">
          Civitas
        </h1>
        <p className="text-2xl text-blue-100 mb-8 text-center max-w-2xl">
          The first AI Agent that negotiates, deploys, and funds cross-chain agreements in a single click
        </p>

        <div className="flex gap-4">
          <Link
            href="/create"
            className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-50 transition-colors"
          >
            Create Agreement
          </Link>
          <Link
            href="/dashboard"
            className="bg-blue-500 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-400 transition-colors"
          >
            View Dashboard
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl">
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 text-white">
            <div className="text-3xl mb-3">🤖</div>
            <h3 className="font-semibold mb-2">AI-Powered Logic</h3>
            <p className="text-blue-100 text-sm">Natural language to smart contract configuration</p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 text-white">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="font-semibold mb-2">Cross-Chain Liquidity</h3>
            <p className="text-blue-100 text-sm">Fund from any token on any chain via LI.FI</p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 text-white">
            <div className="text-3xl mb-3">🔗</div>
            <h3 className="font-semibold mb-2">Human-Readable Identity</h3>
            <p className="text-blue-100 text-sm">Basenames for memorable contract addresses</p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Test create page**

```bash
npm run dev
# Visit http://localhost:3000/create
```

Expected: Split-screen interface with chat and contract card

**Step 4: Commit create page**

```bash
git add app/create/page.tsx app/page.tsx
git commit -m "feat: add split-screen create page with landing"
```

---

## Phase 5: Contract Deployment & Funding

### Task 14: Implement Contract Deployment Hook

**Files:**
- Create: `hooks/useContractDeploy.ts`
- Create: `lib/contracts/predict-address.ts`

**Step 1: Write address prediction utility**

Create `lib/contracts/predict-address.ts`:
```typescript
import { keccak256, encodePacked, getContractAddress } from 'viem';
import { getContracts } from './constants';

export function predictRentalAddress(
  chainId: number,
  userAddress: `0x${string}`,
  suggestedName: string
): `0x${string}` {
  const { factory } = getContracts(chainId);

  const salt = keccak256(
    encodePacked(['address', 'string'], [userAddress, suggestedName])
  );

  // EIP-1167 minimal proxy bytecode hash
  // This needs to match OpenZeppelin Clones.sol implementation
  const initCodeHash = keccak256(
    encodePacked(
      ['bytes', 'bytes20', 'bytes'],
      [
        '0x3d602d80600a3d3981f3363d3d373d3d3d363d73',
        getContracts(chainId).implementation,
        '0x5af43d82803e903d91602b57fd5bf3'
      ]
    )
  );

  return getContractAddress({
    bytecodeHash: initCodeHash,
    from: factory,
    opcode: 'CREATE2',
    salt,
  });
}
```

**Step 2: Write deployment hook**

Create `hooks/useContractDeploy.ts`:
```typescript
'use client';

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId } from 'wagmi';
import { RENTAL_FACTORY_ABI } from '@/lib/contracts/abis';
import { getContracts } from '@/lib/contracts/constants';
import { RentalConfig } from '@/lib/ai/schemas';
import { parseUnits } from 'viem';
import { predictRentalAddress } from '@/lib/contracts/predict-address';

export function useContractDeploy() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const [predictedAddress, setPredictedAddress] = useState<`0x${string}` | null>(null);
  const [suggestedName, setSuggestedName] = useState<string | null>(null);

  async function generateName(config: RentalConfig) {
    const response = await fetch('/api/generate-name', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config }),
    });
    const { suggestedName } = await response.json();
    return suggestedName;
  }

  async function deployContract(config: RentalConfig, landlordAddress: `0x${string}`) {
    if (!address) throw new Error('Wallet not connected');

    // Generate name
    const name = await generateName(config);
    setSuggestedName(name);

    // Predict address
    const predicted = predictRentalAddress(chainId, address, name);
    setPredictedAddress(predicted);

    // Deploy
    const { factory } = getContracts(chainId);
    const monthlyAmountWei = parseUnits(config.monthlyAmount.toString(), 6); // USDC has 6 decimals

    writeContract({
      address: factory,
      abi: RENTAL_FACTORY_ABI,
      functionName: 'deployRental',
      args: [
        landlordAddress,
        config.tenant as `0x${string}`, // TODO: ENS resolution
        monthlyAmountWei,
        config.totalMonths,
        name,
      ],
    });
  }

  return {
    deployContract,
    isPending,
    isConfirming,
    isSuccess,
    hash,
    predictedAddress,
    suggestedName,
  };
}
```

**Step 3: Commit deployment utilities**

```bash
git add hooks/useContractDeploy.ts lib/contracts/predict-address.ts
git commit -m "feat: add contract deployment hook with CREATE2 prediction"
```

---

### Task 15: Create Deploy Modal with LI.FI Integration

**Files:**
- Create: `components/deploy/DeployModal.tsx`
- Create: `components/deploy/LiFiBridgeStep.tsx`
- Create: `lib/lifi/widget-config.ts`

**Step 1: Install LI.FI Widget**

```bash
npm install @lifi/widget
```

**Step 2: Write LI.FI config**

Create `lib/lifi/widget-config.ts`:
```typescript
import { WidgetConfig } from '@lifi/widget';

export function createLiFiConfig(
  destinationAddress: string,
  requiredAmount: string
): WidgetConfig {
  return {
    integrator: 'Civitas',
    appearance: 'light',
    toChain: 8453, // Base
    toToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base USDC
    toAddress: destinationAddress,
    toAmount: requiredAmount,
    disableToAddress: true, // Lock destination
    disableToChain: true, // Lock to Base
    disableToToken: true, // Lock to USDC
  };
}
```

**Step 3: Write LI.FI bridge component**

Create `components/deploy/LiFiBridgeStep.tsx`:
```typescript
'use client';

import { LiFiWidget, WidgetConfig } from '@lifi/widget';
import { createLiFiConfig } from '@/lib/lifi/widget-config';

interface LiFiBridgeStepProps {
  destinationAddress: string;
  requiredAmount: string;
  onSuccess: () => void;
}

export function LiFiBridgeStep({
  destinationAddress,
  requiredAmount,
  onSuccess,
}: LiFiBridgeStepProps) {
  const config = createLiFiConfig(destinationAddress, requiredAmount);

  return (
    <div className="w-full">
      <LiFiWidget
        config={config}
        integrator="Civitas"
      />
    </div>
  );
}
```

**Step 4: Write deploy modal**

Create `components/deploy/DeployModal.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { useContractDeploy } from '@/hooks/useContractDeploy';
import { RentalConfig } from '@/lib/ai/schemas';
import { LiFiBridgeStep } from './LiFiBridgeStep';
import { useAccount } from 'wagmi';
import { formatUnits } from 'viem';

interface DeployModalProps {
  config: RentalConfig;
  isOpen: boolean;
  onClose: () => void;
}

export function DeployModal({ config, isOpen, onClose }: DeployModalProps) {
  const { address } = useAccount();
  const {
    deployContract,
    isPending,
    isConfirming,
    isSuccess,
    predictedAddress,
    suggestedName,
  } = useContractDeploy();

  const [step, setStep] = useState<'deploy' | 'fund' | 'complete'>('deploy');

  if (!isOpen) return null;

  const totalAmount = config.monthlyAmount * config.totalMonths;

  async function handleDeploy() {
    if (!address) return;
    await deployContract(config, address);
    setStep('fund');
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold">Deploy & Fund Contract</h2>
          <p className="text-gray-600 mt-1">
            {step === 'deploy' && 'Step 1: Deploy contract to Base'}
            {step === 'fund' && 'Step 2: Fund contract from any chain'}
            {step === 'complete' && 'Contract deployed and funded!'}
          </p>
        </div>

        <div className="p-6">
          {step === 'deploy' && (
            <div>
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold mb-2">Contract Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tenant:</span>
                    <span className="font-mono">{config.tenant}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Monthly Rent:</span>
                    <span>{config.monthlyAmount} USDC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span>{config.totalMonths} months</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Total Required:</span>
                    <span>{totalAmount} USDC</span>
                  </div>
                </div>
              </div>

              {suggestedName && (
                <div className="mb-6">
                  <p className="text-sm text-gray-600 mb-2">Contract Basename:</p>
                  <code className="bg-gray-100 px-3 py-2 rounded block">
                    {suggestedName}.civitas.base.eth
                  </code>
                </div>
              )}

              <button
                onClick={handleDeploy}
                disabled={isPending || isConfirming}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {isPending && 'Waiting for signature...'}
                {isConfirming && 'Deploying contract...'}
                {!isPending && !isConfirming && 'Deploy Contract'}
              </button>
            </div>
          )}

          {step === 'fund' && predictedAddress && (
            <div>
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-2">Contract Address:</p>
                <code className="bg-gray-100 px-3 py-2 rounded block break-all">
                  {predictedAddress}
                </code>
              </div>

              <LiFiBridgeStep
                destinationAddress={predictedAddress}
                requiredAmount={(totalAmount * 1e6).toString()} // USDC decimals
                onSuccess={() => setStep('complete')}
              />
            </div>
          )}

          {step === 'complete' && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold mb-2">Success!</h3>
              <p className="text-gray-600">
                Your rental agreement is deployed and funded on Base
              </p>
              <button
                onClick={onClose}
                className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                View Dashboard
              </button>
            </div>
          )}
        </div>

        <div className="p-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 5: Integrate modal into ContractCard**

Modify `components/contract/ContractCard.tsx`:
```typescript
// Add at top
import { useState } from 'react';
import { DeployModal } from '../deploy/DeployModal';

// Add to component
const [isModalOpen, setIsModalOpen] = useState(false);

// Update button
<button
  onClick={() => setIsModalOpen(true)}
  disabled={!config}
  className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
>
  Sign & Fund Contract
</button>

{config && (
  <DeployModal
    config={config}
    isOpen={isModalOpen}
    onClose={() => setIsModalOpen(false)}
  />
)}
```

**Step 6: Test deployment flow**

```bash
npm run dev
# Test full flow: chat → config → deploy → fund
```

Expected: Modal opens, contract deploys, LI.FI widget appears

**Step 7: Commit deploy modal**

```bash
git add components/deploy/ lib/lifi/ components/contract/ContractCard.tsx
git commit -m "feat: add deployment modal with LI.FI bridge integration"
```

---

## Phase 6: Dashboard & Contract Management

### Task 16: Create Contract Fetching Utilities

**Files:**
- Create: `lib/contracts/fetch-contracts.ts`

**Step 1: Write server-side contract fetcher**

Create `lib/contracts/fetch-contracts.ts`:
```typescript
import { createPublicClient, http, getContract } from 'viem';
import { base } from 'viem/chains';
import { RENTAL_FACTORY_ABI, RECURRING_RENT_ABI } from './abis';
import { getContracts } from './constants';

const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL),
});

export interface RentalContract {
  address: `0x${string}`;
  landlord: `0x${string}`;
  tenant: `0x${string}`;
  monthlyAmount: bigint;
  totalMonths: number;
  state: number;
  startTime: bigint;
  totalPaid: bigint;
  basename?: string;
}

export async function fetchUserContracts(
  userAddress: `0x${string}`
): Promise<RentalContract[]> {
  const { factory } = getContracts(base.id);

  // Get deployment events
  const logs = await publicClient.getLogs({
    address: factory,
    event: {
      type: 'event',
      name: 'RentalDeployed',
      inputs: [
        { type: 'address', indexed: true, name: 'creator' },
        { type: 'address', indexed: true, name: 'rental' },
        { type: 'address', indexed: true, name: 'landlord' },
        { type: 'address', indexed: false, name: 'tenant' },
        { type: 'string', indexed: false, name: 'suggestedName' },
      ],
    },
    fromBlock: 0n,
    toBlock: 'latest',
  });

  // Filter for user's contracts
  const userLogs = logs.filter((log) => {
    const { landlord, tenant } = log.args as any;
    return (
      landlord?.toLowerCase() === userAddress.toLowerCase() ||
      tenant?.toLowerCase() === userAddress.toLowerCase()
    );
  });

  // Fetch contract details
  const contracts = await Promise.all(
    userLogs.map(async (log) => {
      const rentalAddress = (log.args as any).rental;

      const contract = getContract({
        address: rentalAddress,
        abi: RECURRING_RENT_ABI,
        client: publicClient,
      });

      const [landlord, tenant, monthlyAmount, totalMonths, state, startTime, totalPaid] =
        await Promise.all([
          contract.read.landlord(),
          contract.read.tenant(),
          contract.read.monthlyAmount(),
          contract.read.totalMonths(),
          contract.read.state(),
          contract.read.startTime ? contract.read.startTime() : 0n,
          contract.read.totalPaid ? contract.read.totalPaid() : 0n,
        ]);

      return {
        address: rentalAddress,
        landlord,
        tenant,
        monthlyAmount,
        totalMonths: Number(totalMonths),
        state: Number(state),
        startTime,
        totalPaid,
        basename: (log.args as any).suggestedName,
      };
    })
  );

  return contracts;
}
```

**Step 2: Commit fetching utilities**

```bash
git add lib/contracts/fetch-contracts.ts
git commit -m "feat: add server-side contract fetching utilities"
```

---

### Task 17: Create Dashboard Page

**Files:**
- Create: `app/dashboard/page.tsx`
- Create: `components/dashboard/DashboardClient.tsx`
- Create: `components/dashboard/ContractStatusBadge.tsx`

**Step 1: Write status badge component**

Create `components/dashboard/ContractStatusBadge.tsx`:
```typescript
const STATE_LABELS = {
  0: { label: 'Ghost', emoji: '🔴', color: 'bg-red-100 text-red-800' },
  1: { label: 'Active', emoji: '🟢', color: 'bg-green-100 text-green-800' },
  2: { label: 'Completed', emoji: '✅', color: 'bg-blue-100 text-blue-800' },
  3: { label: 'Terminating', emoji: '🟣', color: 'bg-purple-100 text-purple-800' },
  4: { label: 'Terminated', emoji: '⚫', color: 'bg-gray-100 text-gray-800' },
};

export function ContractStatusBadge({ state }: { state: number }) {
  const status = STATE_LABELS[state as keyof typeof STATE_LABELS] || STATE_LABELS[0];

  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
      <span>{status.emoji}</span>
      {status.label}
    </span>
  );
}
```

**Step 2: Write dashboard client component**

Create `components/dashboard/DashboardClient.tsx`:
```typescript
'use client';

import { RentalContract } from '@/lib/contracts/fetch-contracts';
import { ContractStatusBadge } from './ContractStatusBadge';
import { formatUnits } from 'viem';
import Link from 'next/link';

interface DashboardClientProps {
  contracts: RentalContract[];
  userAddress: string;
}

export function DashboardClient({ contracts, userAddress }: DashboardClientProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {contracts.map((contract) => {
        const isLandlord = contract.landlord.toLowerCase() === userAddress.toLowerCase();
        const monthlyUSDC = parseFloat(formatUnits(contract.monthlyAmount, 6));
        const totalUSDC = monthlyUSDC * contract.totalMonths;
        const paidUSDC = parseFloat(formatUnits(contract.totalPaid, 6));
        const progress = (paidUSDC / totalUSDC) * 100;

        return (
          <Link
            key={contract.address}
            href={`/contract/${contract.address}`}
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-lg">
                  {contract.basename || 'Rental Contract'}
                </h3>
                <p className="text-sm text-gray-500 font-mono">
                  {contract.address.slice(0, 6)}...{contract.address.slice(-4)}
                </p>
              </div>
              <ContractStatusBadge state={contract.state} />
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Role:</span>
                <span className="font-medium">{isLandlord ? 'Landlord' : 'Tenant'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Monthly:</span>
                <span className="font-medium">{monthlyUSDC.toFixed(2)} USDC</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Duration:</span>
                <span className="font-medium">{contract.totalMonths} months</span>
              </div>
            </div>

            {contract.state === 1 && (
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Progress:</span>
                  <span className="font-medium">{progress.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </Link>
        );
      })}

      {contracts.length === 0 && (
        <div className="col-span-full text-center py-12">
          <p className="text-gray-500 mb-4">No contracts yet</p>
          <Link
            href="/create"
            className="text-blue-600 hover:underline"
          >
            Create your first contract →
          </Link>
        </div>
      )}
    </div>
  );
}
```

**Step 3: Write dashboard page**

Create `app/dashboard/page.tsx`:
```typescript
import { fetchUserContracts } from '@/lib/contracts/fetch-contracts';
import { DashboardClient } from '@/components/dashboard/DashboardClient';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { address?: string };
}) {
  const userAddress = searchParams.address;

  let contracts = [];
  if (userAddress) {
    contracts = await fetchUserContracts(userAddress as `0x${string}`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-gray-900">
            Civitas
          </Link>
          <ConnectButton />
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">My Contracts</h1>

        {userAddress ? (
          <DashboardClient contracts={contracts} userAddress={userAddress} />
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">Connect your wallet to view your contracts</p>
            <ConnectButton />
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 4: Update dashboard link to pass address**

Modify `app/page.tsx` dashboard link:
```typescript
// This will need client-side address passing
// For now, just link to /dashboard and handle connection there
```

**Step 5: Test dashboard**

```bash
npm run dev
# Connect wallet and visit /dashboard?address=0x...
```

Expected: Dashboard shows user's contracts

**Step 6: Commit dashboard**

```bash
git add app/dashboard/ components/dashboard/
git commit -m "feat: add dashboard with contract list and status badges"
```

---

## Phase 7: Testing & Polish

### Task 18: Add ENS Resolution

**Files:**
- Create: `lib/ens/resolver.ts`
- Modify: `hooks/useContractDeploy.ts`

**Step 1: Write ENS resolver**

Create `lib/ens/resolver.ts`:
```typescript
import { createPublicClient, http, normalize } from 'viem';
import { mainnet } from 'viem/chains';

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(process.env.NEXT_PUBLIC_MAINNET_RPC_URL),
});

export async function resolveENS(ensName: string): Promise<`0x${string}` | null> {
  try {
    const address = await publicClient.getEnsAddress({
      name: normalize(ensName),
    });
    return address;
  } catch (error) {
    console.error('ENS resolution failed:', error);
    return null;
  }
}

export function isENSName(input: string): boolean {
  return input.endsWith('.eth') || input.endsWith('.base.eth');
}

export function isAddress(input: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(input);
}
```

**Step 2: Update deployment hook to resolve ENS**

Modify `hooks/useContractDeploy.ts`:
```typescript
import { resolveENS, isENSName, isAddress } from '@/lib/ens/resolver';

// In deployContract function, before writeContract:
let tenantAddress: `0x${string}`;
if (isENSName(config.tenant)) {
  const resolved = await resolveENS(config.tenant);
  if (!resolved) throw new Error(`Failed to resolve ENS name: ${config.tenant}`);
  tenantAddress = resolved;
} else if (isAddress(config.tenant)) {
  tenantAddress = config.tenant as `0x${string}`;
} else {
  throw new Error('Invalid tenant address or ENS name');
}

// Use tenantAddress in writeContract
```

**Step 3: Commit ENS resolution**

```bash
git add lib/ens/ hooks/useContractDeploy.ts
git commit -m "feat: add ENS name resolution for tenant addresses"
```

---

### Task 19: Add Environment Variables Documentation

**Files:**
- Create: `README.md`

**Step 1: Write comprehensive README**

Create `README.md`:
```markdown
# Civitas - AI-Powered Cross-Chain Rental Agreements

The first AI Agent that negotiates, deploys, and funds cross-chain agreements in a single click.

## Features

- 🤖 **AI-Powered Logic**: Chat with Gemini AI to create smart contract configurations
- ⚡ **Cross-Chain Liquidity**: Fund contracts from any token on any chain via LI.FI
- 🔗 **Human-Readable Identity**: Basenames for memorable contract addresses
- 🔒 **Secure & Audited**: Built with OpenZeppelin contracts and CREATE2 deployment

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Wallet**: RainbowKit v2, wagmi v2, viem
- **AI**: Gemini 3 Flash, Vercel AI SDK
- **Smart Contracts**: Solidity 0.8.20, Foundry
- **Cross-Chain**: LI.FI Widget
- **Identity**: Basenames (ENS on Base)

## Getting Started

### Prerequisites

- Node.js 18+
- Foundry (for contract development)
- WalletConnect Project ID
- Gemini API Key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/civitas.git
cd civitas
```

2. Install dependencies:
```bash
npm install
cd contracts && forge install && cd ..
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your keys:
```env
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
NEXT_PUBLIC_MAINNET_RPC_URL=https://eth.llamarpc.com
```

4. Deploy contracts (testnet):
```bash
cd contracts
cp .env.example .env
# Add your PRIVATE_KEY to .env
forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast
```

5. Update `.env.local` with deployed addresses:
```env
NEXT_PUBLIC_FACTORY_ADDRESS=0x...
NEXT_PUBLIC_RENTAL_IMPLEMENTATION=0x...
```

6. Run development server:
```bash
npm run dev
```

Visit http://localhost:3000

## Usage

### Creating a Rental Agreement

1. Click "Create Agreement"
2. Chat with AI: "I want to rent my apartment to bob.eth for 6 months at 1000 USDC per month"
3. Review the contract preview
4. Click "Sign & Fund"
5. Deploy contract (Tx #1)
6. Fund from any chain using LI.FI widget (Tx #2)
7. Done! Contract is live on Base

### Managing Contracts

1. Visit Dashboard
2. View all your contracts (as landlord or tenant)
3. Release pending rent
4. Initiate early termination (landlord only)

## Smart Contracts

### RecurringRent.sol

- Balance-based activation (handles async funding)
- Permissionless rent release
- 30-day termination notice
- Pro-rata refunds

### RentalFactory.sol

- CREATE2 deployment for predictable addresses
- EIP-1167 minimal proxies for gas efficiency
- Basename registration
- Anti-snipe protection

## Project Structure

```
civitas/
├── app/                    # Next.js pages
├── components/             # React components
├── hooks/                  # Custom React hooks
├── lib/                    # Utilities
│   ├── ai/                # AI schemas and prompts
│   ├── contracts/         # Contract ABIs and utils
│   ├── ens/               # ENS resolution
│   └── lifi/              # LI.FI configuration
└── contracts/             # Foundry project
    ├── src/               # Smart contracts
    ├── test/              # Contract tests
    └── script/            # Deployment scripts
```

## Testing

### Smart Contracts
```bash
cd contracts
forge test -vv
```

### Frontend
```bash
npm run build
npm run start
```

## Deployment

### Contracts

Deploy to Base Mainnet:
```bash
cd contracts
forge script script/Deploy.s.sol --rpc-url base --broadcast --verify
```

### Frontend

Deploy to Vercel:
```bash
vercel --prod
```

## License

MIT

## Hackathon Submission

Built for ETH HackMoney 2026:
- **LI.FI Track**: Best AI x LI.FI Smart App
- **ENS Track**: Most Creative Use of ENS for DeFi
```

**Step 2: Commit README**

```bash
git add README.md
git commit -m "docs: add comprehensive README with setup instructions"
```

---

### Task 20: Final Testing & Bug Fixes

**Files:**
- Various (as needed)

**Step 1: Test complete user flow**

```bash
npm run dev
# Test:
# 1. Connect wallet
# 2. Chat to create config
# 3. Deploy contract
# 4. Fund via LI.FI
# 5. View on dashboard
```

Expected: Full flow works end-to-end

**Step 2: Test contract interactions**

```bash
cd contracts
forge test -vvv
```

Expected: All tests pass

**Step 3: Check for TypeScript errors**

```bash
npm run build
```

Expected: No type errors

**Step 4: Fix any bugs found**

(Make fixes as needed)

**Step 5: Final commit**

```bash
git add .
git commit -m "fix: resolve final bugs and improve UX"
```

---

## Execution Complete

Plan saved to: `docs/plans/2026-02-01-civitas-implementation.md`

**Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
