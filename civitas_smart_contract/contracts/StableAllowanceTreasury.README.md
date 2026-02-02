# 🏦 StableAllowanceTreasury - Template 3

## Overview

**StableAllowanceTreasury** is a counter-based USDC treasury contract designed for controlled periodic allowance releases. Perfect for parent-to-child remittances, educational stipends, or any scenario requiring controlled spending.

## 📋 Key Features

- ✅ **Counter-Based Control**: Owner approves allowances by incrementing a counter
- ✅ **Fixed Allowance Amounts**: Each claim releases a predetermined USDC amount
- ✅ **Fast-Track Support**: Owner can approve multiple allowances at once
- ✅ **State Management**: Active, Paused, and Terminated states
- ✅ **Emergency Controls**: Owner can pause or terminate the treasury
- ✅ **Minimal Proxy Pattern**: Gas-efficient deployment via EIP-1167

## 🎯 Use Cases

| Use Case | Owner | Recipient | Allowance Example |
|----------|-------|-----------|-------------------|
| **Parental Allowance** | Parent | Child | $50/week |
| **Educational Stipend** | University | Student | $200/month |
| **Travel Allowance** | Company | Employee | $100/day |
| **Remittances** | Sender | Family Member | $500/month |
| **Controlled Spending** | Trust Manager | Beneficiary | Custom amount |

## 🔧 Core Mechanics

### The Counter System

```
Owner approves → approvalCounter++
Recipient claims → claimedCount++

Available claims = approvalCounter - claimedCount
```

### Example Flow

```solidity
// 1. Owner approves 1 allowance
incrementCounter(1);  // approvalCounter = 1

// 2. Recipient claims
claim();  // claimedCount = 1, receives 50 USDC

// 3. Owner fast-tracks 3 allowances (e.g., for travel)
incrementCounter(3);  // approvalCounter = 4

// 4. Recipient can claim 3 more times
claim();  // claimedCount = 2
claim();  // claimedCount = 3
claim();  // claimedCount = 4
```

## 📊 Contract State

```solidity
enum State {
    Active,      // Normal operation
    Paused,      // Temporarily stopped
    Terminated   // Permanently closed
}
```

## 🔑 Functions

### Owner Functions

#### `incrementCounter(uint256 _incrementBy)`
Approve additional allowances for the recipient to claim.

```solidity
// Approve 1 allowance
incrementCounter(1);

// Fast-track 5 allowances
incrementCounter(5);
```

**Events:** `ApprovalIncremented(address indexed owner, uint256 newApprovalCount, uint256 incrementAmount)`

#### `pause()`
Temporarily pause the treasury (prevents claims and approvals).

```solidity
pause();  // State → Paused
```

**Events:** `StateChanged(State oldState, State newState)`

#### `unpause()`
Resume normal operations.

```solidity
unpause();  // State → Active
```

#### `terminate()`
Permanently close the treasury and withdraw all remaining funds to owner.

```solidity
terminate();  // State → Terminated, funds returned to owner
```

**Events:** `StateChanged(State oldState, State newState)`, `EmergencyWithdrawal(address indexed to, uint256 amount)`

#### `emergencyWithdraw()`
Withdraw all funds when paused or terminated.

```solidity
emergencyWithdraw();  // Requires Paused or Terminated state
```

### Recipient Functions

#### `claim()`
Claim an available allowance (if approved and funded).

```solidity
claim();  // Receives allowancePerIncrement USDC
```

**Requirements:**
- `claimedCount < approvalCounter` (must have unclaimed allowances)
- Treasury balance ≥ `allowancePerIncrement`
- State must be `Active`

**Events:** `AllowanceClaimed(address indexed recipient, uint256 amount, uint256 claimNumber)`

### Public Functions

#### `deposit(uint256 _amount)`
Anyone can deposit USDC to fund the treasury.

```solidity
// Approve USDC first
USDC.approve(treasuryAddress, amount);

// Then deposit
treasury.deposit(amount);
```

**Events:** `Deposited(address indexed from, uint256 amount, uint256 newBalance)`

### View Functions

#### `unclaimedAllowances()` → `uint256`
Returns the number of allowances ready to be claimed.

```solidity
uint256 available = treasury.unclaimedAllowances();
// Returns: approvalCounter - claimedCount
```

#### `treasuryBalance()` → `uint256`
Returns the current USDC balance.

```solidity
uint256 balance = treasury.treasuryBalance();
```

#### `getTreasuryStatus()` → `(address, address, uint256, uint256, uint256, uint256, uint256, State)`
Returns comprehensive status information.

```solidity
(
    address owner,
    address recipient,
    uint256 allowancePerIncrement,
    uint256 approvalCounter,
    uint256 claimedCount,
    uint256 unclaimed,
    uint256 balance,
    State state
) = treasury.getTreasuryStatus();
```

## 🎬 Deployment

### Option 1: Direct Deployment (Testing)

```typescript
const Treasury = await ethers.getContractFactory("StableAllowanceTreasury");
const treasury = await Treasury.deploy();
await treasury.waitForDeployment();

await treasury.initialize(
    ownerAddress,
    recipientAddress,
    ethers.parseUnits("50", 6)  // 50 USDC
);
```

### Option 2: Factory Pattern (Production)

```solidity
// Factory creates minimal proxies (EIP-1167)
address newTreasury = factory.deployTreasury(
    owner,
    recipient,
    50 * 10**6,  // 50 USDC
    "parent-child-allowance"
);
```

## 📈 Gas Costs (Estimates)

| Operation | Gas Cost |
|-----------|----------|
| Deploy Implementation | ~1,200,000 |
| Deploy via Clone (Factory) | ~150,000 |
| incrementCounter(1) | ~45,000 |
| claim() | ~65,000 |
| deposit() | ~50,000 |

## 🔒 Security Features

1. **Access Control**
   - Only owner can increment counter
   - Only recipient can claim
   - Clear separation of roles

2. **State Validation**
   - Claims require active state
   - Balance checks before transfers
   - Counter validation (claimed < approved)

3. **Emergency Controls**
   - Owner can pause operations
   - Emergency withdrawal when paused
   - Termination with fund recovery

4. **Initialization Protection**
   - Zero address checks
   - Owner ≠ Recipient validation
   - Positive allowance amount requirement

## 📝 Example Scenarios

### Scenario 1: Weekly Allowance

```typescript
// Parent sets up $50/week allowance for child
const weeklyAmount = ethers.parseUnits("50", 6);
await treasury.initialize(parentAddress, childAddress, weeklyAmount);

// Fund for 4 weeks
await usdc.approve(treasuryAddress, ethers.parseUnits("200", 6));
await treasury.deposit(ethers.parseUnits("200", 6));

// Week 1: Approve
await treasury.connect(parent).incrementCounter(1);
await treasury.connect(child).claim();  // Gets $50

// Repeat weekly...
```

### Scenario 2: Travel Fast-Track

```typescript
// Child going on trip, parent approves 5 days at once
await treasury.connect(parent).incrementCounter(5);

// Child can claim 5 times
for (let i = 0; i < 5; i++) {
    await treasury.connect(child).claim();  // Gets $50 each time
}
```

### Scenario 3: Emergency Pause

```typescript
// Parent notices suspicious activity
await treasury.connect(parent).pause();

// Child cannot claim while paused
await expect(treasury.connect(child).claim()).to.be.revertedWith("Treasury not active");

// Parent investigates, then resumes
await treasury.connect(parent).unpause();
```

## 🧪 Testing

Run the test suite:

```bash
# Run all tests
yarn hardhat:test

# Run specific test
yarn hardhat test test/StableAllowanceTreasury.ts

# Run with coverage
yarn hardhat coverage
```

## 🚀 Integration with Civitas

This contract is **Template 3** in the Civitas ecosystem:

```typescript
// AI parses intent
"I want to send my daughter $50 weekly allowance"

// Backend generates config
{
    "templateId": 3,
    "params": {
        "owner": "0xParent...",
        "recipient": "0xChild...",
        "allowancePerIncrement": 50000000,  // 50 USDC
        "ensLabel": "daughter-allowance"
    }
}

// Factory deploys via CREATE2
const treasury = factory.deployTreasury(params);

// LI.FI bridges funds from any chain
lifi.bridge({
    to: treasuryAddress,
    amount: "200 USDC",  // 4 weeks
    fromChain: "Arbitrum"
});
```

## 🔗 Contract Addresses

| Network | Address |
|---------|---------|
| Base Mainnet | TBD |
| Base Sepolia | TBD |
| Local Hardhat | Check deployment logs |

## 📚 Additional Resources

- [OpenZeppelin Clones](https://docs.openzeppelin.com/contracts/5.x/api/proxy#Clones)
- [Base USDC](https://basescan.org/token/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)
- [Civitas Documentation](../action_plan/)

## 🤝 Contributing

This contract is part of the Civitas hackathon project. For improvements or bug reports, please open an issue or submit a PR.

---

**Built with ❤️ for ETH HackMoney 2026**
