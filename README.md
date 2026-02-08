# Civitas - AI-Powered Cross-Chain Agreement Platform

**Civitas** transforms natural language into deployed, funded, and verifiable smart contracts — all within a single conversational flow.

Our mission is to eliminate the complexity barrier between everyday users and decentralized finance by letting an AI agent handle negotiation, deployment, and cross-chain funding so that anyone can create trustless financial agreements without writing a single line of code or understanding blockchain mechanics.

---

## 🤖 Agentic AI at the Core

Civitas is built around a conversational AI agent powered by **Gemini 3 Flash** and the **Vercel AI SDK**. Rather than presenting users with intimidating forms, the agent engages in natural dialogue — asking one clarifying question at a time to extract structured contract configurations validated against strict Zod schemas.

The agent is equipped with five specialized tools that it invokes autonomously:

1. **ENS Name Resolution**: Resolves names across L1 and L2.
2. **Ethereum Address Validation**: Checks if addresses are EOAs or contracts.
3. **USDC Balance Checking**: Verifies funds on Base.
4. **Proactive Multi-Chain Wallet Scanning**: Scans Ethereum, Base, Arbitrum, Optimism, and Polygon simultaneously.
5. **Optimal Cross-Chain Funding Route Calculation**: Queries LI.FI for the cheapest and fastest bridging route.

When a user says "I'm ready to fund," the agent proactively scans their wallet across all supported chains, identifies where their assets sit, queries LI.FI for the cheapest and fastest bridging route, and presents a recommendation — all without the user needing to understand bridging, gas costs, or chain differences.

---

## ⚙️ R2F2C: Requirement-to-FSM-to-Code

Civitas follows a **Requirement-to-FSM-to-Code (R2F2C)** pipeline. Users express requirements in plain English (e.g., "I want to split rent with my two roommates at $1,000/month for 6 months"). The AI agent maps these requirements onto one of three finite state machine templates:

* **RentVault**: Multi-tenant rent collection with landlord withdrawal and refund states.
* **GroupBuyEscrow**: Collective purchases with funding, delivery confirmation, majority voting, and timelock refund states.
* **StableAllowanceTreasury**: Counter-based periodic allowances with pause, unpause, and termination states.

Each template implements a formally defined state machine in Solidity with explicit transitions and guards. The AI then populates the FSM parameters (participants, amounts, dates, shares in basis points) and deploys the configured contract via a gas-efficient **EIP-1167 proxy clone** from our `CivitasFactory`, using **CREATE2** for deterministic address prediction.

---

## 🌉 Cross-Chain Liquidity via LI.FI

Funding a contract shouldn't require users to be on the right chain with the right token. Civitas integrates the **LI.FI SDK** to enable funding from 60+ source chains.

The AI agent first scans the user's balances across five major chains, then queries LI.FI's routing engine to find the optimal path — comparing gas costs, execution duration, and bridging tools (Across, Hop, Stargate, etc.). The destination is locked to **Base USDC** at the contract's predicted CREATE2 address, so funds bridge directly into the contract.

Contracts use **balance-based activation** — once sufficient USDC arrives (even after a 1-5 minute bridge delay), the contract automatically becomes active without any additional user action.

---

## 🆔 Decentralized Identity & On-Chain Verification via ENS

Every deployed contract receives a human-readable Basename (ENS on Base) such as `downtown-studio-6mo.civitas.base.eth`.

But Civitas goes far beyond simple naming — each contract stores **11-14 ENS text records on-chain** containing full contract metadata:

* Type & Status
* Rent/Funding Amounts
* Due Dates
* Participant Count
* Voting Thresholds
* Funding Progress
* Currency Details
* Legal Classification

This transforms ENS from a naming system into a **decentralized contract registry**. Anyone can look up a contract's terms and status through our public verification page without connecting a wallet — enabling transparent, trustless discovery and audit of agreements.

---

## 🛠️ Tech Stack

* **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
* **Wallet Connectivity**: RainbowKit v2, wagmi v2
* **Smart Contracts**: Solidity 0.8.20, Foundry (Deployed on Base L2)
* **Backend**: Express.js with SWC builds
* **Database**: Supabase (PostgreSQL 17 with Row Level Security)
* **AI Layer**: Google Gemini 3 Flash (via Vercel AI SDK)
* **Cross-Chain**: LI.FI SDK
* **Identity**: ENS (Base L2 Registry & Text Resolver)

---

## 🏗️ How it's Made

Civitas is built as a full-stack dApp with a **Next.js 15 App Router** frontend, **Solidity 0.8.20** smart contracts compiled with **Foundry**, and an **Express.js** backend.

### The AI Agent (Gemini 3 Flash + Vercel AI SDK)

At the core is a conversational AI agent powered by **Google's Gemini 3 Flash**, integrated through the **Vercel AI SDK's `streamText()` API** running on Edge Runtime. Instead of forms, users describe what they want in plain English. The agent is equipped with agentic tools it invokes autonomously mid-conversation:

* `resolveENS`: Resolves .eth, .base.eth, and .basetest.eth names.
* `validateAddress`: Checks if an address is an EOA or contract.
* `checkBalance`: Reads USDC balances on Base.
* `scanWalletBalances`: Proactively scans ETH and USDC across Ethereum, Base, Arbitrum, Optimism, and Polygon simultaneously using parallel viem clients.
* `getOptimalFundingRoute`: Queries LI.FI's routing engine to compare gas costs, execution time, and bridging tools.

After each AI response, a background `extract-config` endpoint calls `generateObject()` with template-specific **Zod schemas** to pull structured configuration (addresses, amounts, dates, participant shares) from the conversation. This powers a real-time contract preview card that updates live as the user chats.

### R2F2C: Requirement-to-FSM-to-Code

The system follows a Requirement-to-FSM-to-Code pipeline. Natural language requirements map onto formally defined finite state machine templates implemented in Solidity:

* **RentVault**: States (Initialized → Fully Funded → Withdrawn/Refunded)
* **GroupBuyEscrow**: States (Funding → Goal Reached → Delivery Confirmed → Voting → Released/Refunded)
* **StableAllowanceTreasury**: States (Active ↔ Paused → Terminated)

The AI extracts FSM parameters, and the `CivitasFactory` deploys the configured state machine as a gas-efficient **EIP-1167 minimal proxy clone**. **CREATE2** deterministic addressing (`salt = keccak256(creator, basename)`) lets us predict the contract address before deployment, which is critical for the funding step.

### LI.FI Integration — Cross-Chain Liquidity

LI.FI is what makes Civitas chain-agnostic. Our `LiFiBridgeStep` component integrates the LI.FI SDK directly — calling `getRoutes()` with the source chain/token and locking the destination to Base USDC at the predicted CREATE2 contract address. It executes via `executeRoute()` with a custom `updateTransactionRequestHook` that applies a **150% gas buffer** on L2 `baseFeePerGas`.

More importantly, LI.FI powers the AI agent itself: the `getOptimalFundingRoutes` tool queries LI.FI's routing API across every chain where the user holds funds, comparing cost and speed. Funds bridge directly to the contract address, and the contract activates automatically via balance-based detection once sufficient USDC arrives.

### ENS — On-Chain Contract Registry

We use ENS as a decentralized contract metadata store. The `CivitasFactory` integrates directly with the **Base L2 ENS Registry** and **Text Resolver** contracts. At deploy time, `createSubdomainAndSetRecords()` registers a semantic Basename (e.g., `downtown-studio-a3f9e2c1.civitas.base.eth`), sets forward address resolution, and writes 11-14 ENS text records on-chain per contract. This includes `contract.type`, `contract.status`, `contract.rent.amount`, `contract.escrow.participantCount`, etc.

This means anyone can look up a contract's full terms and live status by querying its ENS name — no wallet connection or proprietary API required. Our public `/verify` page reads these records to provide trustless contract verification.

### How it all connects

1. User chats with AI → AI extracts config + resolves ENS names + scans wallets.
2. Factory deploys EIP-1167 clone at predicted CREATE2 address.
3. ENS records written on-chain.
4. LI.FI bridges funds from any chain directly to contract.
5. Balance triggers activation.

**One conversation, one click, fully on-chain.**

---

**Website URL**: [https://civitas-fork.vercel.app/](https://civitas-fork.vercel.app/)
