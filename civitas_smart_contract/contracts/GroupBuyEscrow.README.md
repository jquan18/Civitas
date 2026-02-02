# GroupBuyEscrow (Template 2)

## Overview
Group purchase escrow with a lead purchaser and majority vote release.

### Key Rules
- **Funding goal** must be met before expiry.
- **If goal not met by expiry**, participants can `refund()`.
- **If goal met**, purchaser confirms delivery with a proof hash.
- **Majority (>50%)** of participants vote to release funds.
- **Timelock refund** if delivery not confirmed within `timelockRefundDelay` after goal.

## Constructor
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
- `sharesBps` must sum to **10000** (e.g. 3000/3000/4000).

## Functions
- `deposit(uint256 amount)` — participant deposits up to their share.
- `refund()` — if goal not met by expiry.
- `confirmDelivery(string proof)` — recipient confirms delivery (e.g., Google Drive URL).
- `voteRelease()` — participant vote.
- `releaseFunds()` — releases to recipient after majority.
- `timelockRefund()` — refund if no delivery after timelock.

## Notes
- Participants are fixed at deployment.
- Deposits are capped by participant share and total goal.
- Proof string is stored on-chain (e.g., URL or receipt link).
