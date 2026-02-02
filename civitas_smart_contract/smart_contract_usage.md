# Smart Contract Usage Guide

This doc explains how to use:
- `GroupBuyEscrow.sol` (Template 2: Group Buy Escrow)
- `StableAllowanceTreasury.sol` (Template 3: Stable Allowance Treasury)

It also includes suggested DB fields and paymaster/sponsored transaction setup.

---

## 1) GroupBuyEscrow (Template 2)

### Purpose
Shared purchases with escrow, majority vote release, and refunds.

### Constructor Parameters
```
GroupBuyEscrow(
  address usdcAddress,
  address purchaser,
  uint256 fundingGoal,
  uint256 expiryDate,
  uint256 timelockRefundDelay,
  address[] participants,
  uint256[] sharesBps
)
```

**Notes**
- `fundingGoal` is USDC in base units (6 decimals).
- `expiryDate` is unix timestamp (seconds) and must be in the future.
- `timelockRefundDelay` is seconds after goal reached.
- `participants.length == sharesBps.length`, sum of `sharesBps` must be 10000.

### Core Functions
- `deposit(uint256 amount)`
  - Only participants can deposit.
  - Amount capped by participant share and total funding goal.
- `refund()`
  - If goal not met after expiry.
- `confirmDelivery(bytes32 proofHash)` (purchaser only)
  - Store on-chain proof hash of delivery URL/text.
- `voteRelease()` (participants)
  - 1 user = 1 vote.
- `releaseFunds()`
  - Requires >50% votes, sends all USDC to purchaser.
- `timelockRefund()`
  - If goal reached but delivery not confirmed within timelock.

### Expected Inputs
- `deposit(amount)` in USDC base units (e.g. `1 USDC = 1_000_000`).
- `confirmDelivery(keccak256(bytes(urlOrProof)))`.

### Suggested DB Fields
**Escrow**
- `escrow_address`
- `chain_id`
- `usdc_address`
- `purchaser_address`
- `funding_goal`
- `expiry_date`
- `timelock_refund_delay`
- `delivery_proof_hash`
- `delivery_confirmed_at`
- `goal_reached_at`
- `released`
- `total_deposited`

**Participants**
- `escrow_address`
- `participant_address`
- `share_bps`
- `deposit_amount`
- `has_voted`
- `voted_at`

**Events (optional log table)**
- `event_name`
- `tx_hash`
- `block_number`
- `payload`

---

## 2) StableAllowanceTreasury (Template 3)

### Purpose
Owner approves allowances; recipient claims fixed amount.

### Constructor Parameters
```
StableAllowanceTreasury(
  address usdcAddress,
  address owner,
  address recipient,
  uint256 allowancePerIncrement
)
```

**Notes**
- `allowancePerIncrement` is USDC base units (6 decimals).
- `owner != recipient`.

### Core Functions
- `incrementCounter(uint256 incrementBy)` (owner only)
  - Approves N allowances.
- `claim()` (recipient only)
  - Transfers one allowance per claim.
- `deposit(uint256 amount)`
  - Anyone can fund treasury.
- `pause() / unpause() / terminate() / emergencyWithdraw()` (owner only)

### Expected Inputs
- `incrementCounter(1)` for one allowance.
- `deposit(amount)` in USDC base units.

### Suggested DB Fields
**Treasury**
- `treasury_address`
- `chain_id`
- `usdc_address`
- `owner_address`
- `recipient_address`
- `allowance_per_increment`
- `approval_counter`
- `claimed_count`
- `state`
- `balance`

**Events (optional)**
- `ApprovalIncremented`
- `AllowanceClaimed`
- `Deposited`
- `StateChanged`

---

## 3) Sponsored Transactions (Paymaster)

### Required Env Vars (Frontend)
```
NEXT_PUBLIC_CDP_API_KEY=...
NEXT_PUBLIC_PAYMASTER_URL=...
NEXT_PUBLIC_WC_PROJECT_ID=...   # optional unless WalletConnect is used
```

### Wagmi Provider (Smart Wallet + EOA Extensions)
```tsx
import { coinbaseWallet, injected, metaMask } from "wagmi/connectors";
import { createConfig } from "wagmi";
import { baseSepolia } from "viem/chains";
import { http } from "viem";

const paymasterUrl = process.env.NEXT_PUBLIC_PAYMASTER_URL;

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors: [
    coinbaseWallet({ appName: "Civitas", preference: "smartWalletOnly" }),
    metaMask(),
    injected(),
  ],
  transports: {
    [baseSepolia.id]: http(paymasterUrl),
  },
});
```

### OnchainKit Provider (Paymaster)
```tsx
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { baseSepolia } from "viem/chains";

<OnchainKitProvider
  apiKey={process.env.NEXT_PUBLIC_CDP_API_KEY}
  projectId={process.env.NEXT_PUBLIC_WC_PROJECT_ID}
  chain={baseSepolia}
  config={{ paymaster: process.env.NEXT_PUBLIC_PAYMASTER_URL }}
>
  {children}
</OnchainKitProvider>
```

### Sponsored Transactions (Approve → Deposit)
```tsx
import { Transaction, TransactionButton } from "@coinbase/onchainkit/transaction";
import { erc20Abi } from "viem";

const approveCall = [{
  address: USDC_ADDRESS,
  abi: erc20Abi,
  functionName: "approve",
  args: [SPENDER, MAX_UINT256],
}];

const depositCall = [{
  address: CONTRACT_ADDRESS,
  abi: CONTRACT_ABI,
  functionName: "deposit",
  args: [AMOUNT],
}];

// Step 1: Enable USDC
<Transaction calls={approveCall} isSponsored>
  <TransactionButton text="Enable USDC" />
</Transaction>

// Step 2: Deposit
<Transaction calls={depositCall} isSponsored>
  <TransactionButton text="Deposit" />
</Transaction>
```

### Dynamic Approval (Dapp-Filled Params)
```tsx
import { erc20Abi, parseUnits } from "viem";

const usdcAddress = USDC_ADDRESS; // e.g. from chain config
const spender = CONTRACT_ADDRESS; // the vault/escrow contract
const amountInput = "25"; // from user input

const approveAmount = parseUnits(amountInput || "0", 6); // USDC has 6 decimals

const approveCall = [{
  address: usdcAddress,
  abi: erc20Abi,
  functionName: "approve",
  args: [spender, approveAmount],
}];
```

**Important**
- Approve is required for any deposit (ERC-20 rule).
- You can grant a custom allowance amount instead of `MAX_UINT256` when you only want to allow a specific withdrawal/deposit amount (e.g., `args: [SPENDER, AMOUNT]`).
- For EOAs, users still need ETH for gas unless paymaster supports their account type.
- Smart Wallet can use paymaster for sponsored transactions.

