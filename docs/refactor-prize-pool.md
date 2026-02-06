╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 Civitas Prize Optimization Plan

 Context

 Civitas is targeting LI.FI ($6k) and ENS ($5k) hackathon prize tracks. An audit revealed:
 - LI.FI: Solid SDK integration (getRoutes + executeRoute) but no AI-driven strategy loop, no
 any-token support, and no Composer usage. AI has only 3 read-only tools (resolveENS, checkBalance,
 validateAddress).
 - ENS: Good subdomain issuance + text records at deploy time, but records go stale (no live sync).
 No ENS-only viewer page exists.
 - Constraint: Frontend-only changes (no contract redeployment). 12-24 hours available.

 Without contract changes, the Composer ($2,500) track is not viable (contracts lack a
 permissionless checkAndActivate()). We pivot to AI x LI.FI Smart App ($2,000) + Best DeFi
 Integration ($1,500) + ENS pool ($3,500) + Most Creative ENS ($1,500).

 ---
 Feature 1: AI Cross-Chain Funding Advisor (Priority: HIGHEST)

 Target: "Best AI x LI.FI Smart App" ($2,000) — requires "monitor state, decide, then act using
 LI.FI"

 1A. New AI Tool: scanWalletBalances (MONITOR step)

 File: frontend/src/lib/ai/tools.ts — add new tool after line 247

 - Calls LI.FI REST API: GET
 https://li.quest/v1/token/balances?walletAddress={addr}&chains=1,10,42161,137,8453
 - Runs server-side (Edge Runtime) — uses REST, not SDK
 - Returns: tokens per chain with USD values, filtered to >$0.50
 - Limits to top 5 tokens per chain to keep AI context manageable

 1B. New AI Tool: getOptimalFundingRoute (DECIDE step)

 File: frontend/src/lib/ai/tools.ts — add new tool after scanWalletBalances

 - Takes: destinationAddress, requiredAmountUsdc, candidateTokens[] (from scan results)
 - Calls LI.FI REST API: GET https://li.quest/v1/quote per candidate token (parallel)
 - Compares routes by: gas cost USD, estimated time, steps count
 - Returns: ranked routes with recommendation + reasoning
 - Uses toAmount quote variant to find how much source token is needed

 1C. Register new tools

 File: frontend/src/lib/ai/tools.ts line 252 — add to civitasTools export:
 export const civitasTools = {
   resolveENS,
   checkBalance,
   validateAddress,
   scanWalletBalances,      // NEW
   getOptimalFundingRoute,  // NEW
 };

 1D. Update system prompts for funding advisor behavior

 File: frontend/src/lib/ai/prompts.ts — extend TOOL_USAGE_INSTRUCTIONS (line 8-36)

 Add tool descriptions for the 2 new tools plus a FUNDING ADVISOR BEHAVIOR section instructing the
 AI to:
 - Proactively offer to scan wallet when contract config is complete
 - Call scanWalletBalances with the connected wallet address
 - Identify tokens with sufficient balance to fund the contract
 - Call getOptimalFundingRoute with top candidates
 - Present a comparison and make a specific recommendation with reasoning
 - This creates the required MONITOR -> DECIDE -> ACT loop

 1E. Pass AI recommendation to bridge UI (ACT step)

 File: frontend/src/app/create/page.tsx

 - Add state: aiRecommendation: { sourceChainId, sourceTokenAddress, sourceTokenSymbol } | null
 - Add useEffect watching messages for getOptimalFundingRoute tool results
 - Extract the recommended route's chain/token from the tool result
 - Pass recommendedSource prop down to LiFiBridgeStep (once funding UI appears on dashboard)

 File: frontend/src/components/deploy/LiFiBridgeStep.tsx

 - Add optional recommendedSource prop to LiFiBridgeStepProps interface (line 10-16)
 - When provided: pre-select fromChainId and fromTokenAddress on mount
 - Show "AI Recommended" badge next to pre-selected source
 - Auto-trigger fetchRoutes() on mount when recommendation present

 1F. Route comparison card (visual demo impact)

 New file: frontend/src/components/deploy/RouteComparisonCard.tsx

 - Renders when AI returns multiple route options
 - Shows: source chain + token, gas cost, time estimate, steps
 - "BEST ROUTE" badge on the recommended option
 - Displayed in create page's Execution Deck (right panel), after ContractReceiptCard

 Estimated time: 6-8 hours

 ---
 Feature 2: Any-Token Source Support (Priority: HIGH)

 Target: "Best LI.FI-Powered DeFi Integration" ($1,500)

 2A. Add token selector to LiFiBridgeStep

 File: frontend/src/components/deploy/LiFiBridgeStep.tsx

 Current state (line 90): fromTokenAddress hardcoded to USDC_ADDRESSES[fromChainId]

 Changes:
 - Add state for fromTokenAddress and availableTokens
 - When chain is selected, fetch user's tokens on that chain via LI.FI REST API: GET
 https://li.quest/v1/token/balances?walletAddress={addr}&chains={chainId}
 - Render token selector dropdown below chain selector (line ~206-218)
 - Update fetchRoutes to use selected fromTokenAddress instead of always USDC
 - Route cards should show swap step when source isn't USDC (e.g., "ETH -> USDC via Uniswap + Bridge
  via Stargate")

 2B. Update FundingModal similarly

 File: frontend/src/components/dashboard/FundingModal.tsx

 - Pass through recommendedSource prop to LiFiBridgeStep

 Estimated time: 3-4 hours

 ---
 Feature 3: ENS Live Data Layer (Priority: MEDIUM)

 Target: "Integrate ENS" ($3,500 pool) + "Most Creative Use of ENS for DeFi" ($1,500)

 3A. ENS contract viewer page

 New file: frontend/src/app/ens/[name]/page.tsx

 - Input: any Civitas subdomain (e.g., downtown-studio-a3f9e2c1)
 - Uses existing useContractENSData hook (frontend/src/hooks/useContractENSData.ts) — already reads
 8 text record keys from L2 resolver
 - Displays contract info PURELY from ENS text records (no Supabase, no direct contract reads)
 - Shows: contract type, status, amounts, dates, creator address
 - Search input at top for looking up any Civitas ENS name
 - Footer: "All data retrieved from ENS text records on Base" (demonstrates ENS as DeFi data layer)
 - Link from dashboard contract cards to this page

 3B. "Sync ENS" button on dashboard

 New file: frontend/src/hooks/useSyncENS.ts

 - useSyncENS(contractAddress, basename, templateId) hook
 - Step 1: Reads getENSMetadata() from deployed contract (view call)
 - Step 2: Calls factory.setContractENSRecords(contractAddress, basename, keys, values) (write tx)
 - This pushes live contract state to ENS records, making them current

 File: frontend/src/lib/contracts/abis.ts — add getENSMetadata ABI entry to each template ABI:
 { type: 'function', name: 'getENSMetadata', inputs: [],
   outputs: [
     { name: 'contractType', type: 'string' },
     { name: 'status', type: 'string' },
     { name: 'keys', type: 'string[]' },
     { name: 'values', type: 'string[]' }
   ], stateMutability: 'view' }

 Files to modify (add "Sync ENS Records" button):
 - frontend/src/components/dashboard/rent-vault/LandlordView.tsx
 - frontend/src/components/dashboard/group-buy-escrow/GroupBuyEscrowExecutionZone.tsx
 - frontend/src/components/dashboard/stable-allowance-treasury/StableAllowanceTreasuryExecutionZone.
 tsx

 Estimated time: 3-4 hours

 ---
 Feature 4: Demo Polish (Priority: LOW)

 4A. Tool-call animation in chat

 File: frontend/src/app/create/page.tsx or frontend/src/components/chat/ChatBubble.tsx

 When AI calls scanWalletBalances or getOptimalFundingRoute, show a distinctive banner:
 - "Scanning wallet across 5 chains..." (with pulse animation)
 - "Comparing cross-chain routes..." (with pulse animation)

 4B. ENS viewer link from dashboard

 Files: Dashboard execution zone components — add link to /ens/[basename] when contract has a
 basename.

 Estimated time: 1-2 hours

 ---
 Implementation Order
 ┌───────┬──────────────────────────────────────────────────┬──────┬──────────────────────┐
 │ Step  │                     Feature                      │ Time │     Prize Impact     │
 ├───────┼──────────────────────────────────────────────────┼──────┼──────────────────────┤
 │ 1     │ 1A-1C: Two new AI tools + register               │ 3h   │ LI.FI $2K core       │
 ├───────┼──────────────────────────────────────────────────┼──────┼──────────────────────┤
 │ 2     │ 1D: System prompt updates                        │ 1h   │ LI.FI $2K narrative  │
 ├───────┼──────────────────────────────────────────────────┼──────┼──────────────────────┤
 │ 3     │ 2A: Any-token support in LiFiBridgeStep          │ 3h   │ LI.FI $1.5K          │
 ├───────┼──────────────────────────────────────────────────┼──────┼──────────────────────┤
 │ 4     │ 1E-1F: AI→Bridge data flow + RouteComparisonCard │ 2h   │ LI.FI $2K (ACT step) │
 ├───────┼──────────────────────────────────────────────────┼──────┼──────────────────────┤
 │ 5     │ 3A: ENS viewer page                              │ 2h   │ ENS $3.5K + $1.5K    │
 ├───────┼──────────────────────────────────────────────────┼──────┼──────────────────────┤
 │ 6     │ 3B: Sync ENS button + hook + ABI                 │ 2h   │ ENS $1.5K            │
 ├───────┼──────────────────────────────────────────────────┼──────┼──────────────────────┤
 │ 7     │ 4A-4B: Demo polish                               │ 1h   │ General              │
 ├───────┼──────────────────────────────────────────────────┼──────┼──────────────────────┤
 │ Total │                                                  │ ~14h │ $8.5K targeted       │
 └───────┴──────────────────────────────────────────────────┴──────┴──────────────────────┘
 If time is short, cut features from bottom up (4→3B→1F).

 ---
 Files Summary

 New files (3)

 - frontend/src/app/ens/[name]/page.tsx
 - frontend/src/hooks/useSyncENS.ts
 - frontend/src/components/deploy/RouteComparisonCard.tsx

 Modified files (7)

 - frontend/src/lib/ai/tools.ts — 2 new AI tools
 - frontend/src/lib/ai/prompts.ts — funding advisor instructions
 - frontend/src/components/deploy/LiFiBridgeStep.tsx — recommendedSource prop + any-token
 - frontend/src/app/create/page.tsx — AI recommendation state + data flow
 - frontend/src/lib/contracts/abis.ts — getENSMetadata ABI entries
 - frontend/src/components/dashboard/FundingModal.tsx — pass recommendedSource
 - Dashboard execution zone components (3 files) — Sync ENS button

 No changes needed

 - No new API routes (AI tools use LI.FI REST directly from Edge Runtime)
 - No Supabase schema changes
 - No smart contract redeployment

 ---
 Verification

 AI Tools (Feature 1)

 1. Connect wallet with tokens on multiple chains
 2. Complete a contract config via chat
 3. Verify AI proactively says "Let me scan your wallet for funding options..."
 4. Verify scanWalletBalances returns tokens with USD values
 5. Verify getOptimalFundingRoute returns ranked routes with gas costs
 6. Verify AI makes specific recommendation: "I recommend bridging X from Y because..."

 Any-Token (Feature 2)

 1. In bridge step, verify token dropdown loads user's available tokens
 2. Select non-USDC token (e.g., ETH)
 3. Verify routes show swap+bridge steps
 4. Execute a bridge with non-USDC source token

 ENS Viewer (Feature 3)

 1. Navigate to /ens/[known-basename]
 2. Verify all text records display (type, status, amounts)
 3. Verify no Supabase calls in Network tab — purely ENS
 4. Click "Sync ENS" on dashboard for a contract
 5. Refresh ENS viewer — verify updated status

 Demo Narrative

 1. User chats with AI → configures contract
 2. AI scans wallet: "You have $500 USDC on Arbitrum, $200 USDT on Ethereum..."
 3. AI recommends: "Bridge USDC from Arbitrum — $0.12 gas, ~2 min"
 4. User deploys → bridge pre-populated with AI pick
 5. After funding, user syncs ENS records
 6. User shares ENS viewer link — anyone can see contract state via ENS