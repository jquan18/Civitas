# RentVault (Template 1)

## Overview
Multi-tenant rent vault where tenants fund their share and recipient withdraws once fully funded.

### Key Rules
- Tenants deposit up to their assigned share of `rentAmount`.
- Deposits only allowed before `dueDate`.
- Recipient can withdraw only when fully funded.
- If someone refuses to pay, recipient can refund all deposited amounts.

## Constructor
```
RentVault(
  address usdcAddress,
  address recipient,
  uint256 rentAmount,
  uint256 dueDate,
  address[] tenants,
  uint256[] sharesBps
)
```
- `sharesBps` must sum to **10000** (e.g. 5000/5000).
- `rentAmount` is USDC base units (6 decimals).

## Functions
- `deposit(uint256 amount)` — tenant deposits their share.
- `withdrawToRecipient()` — recipient only, requires full funding.
- `refundAll(address[] tenants)` — recipient refunds deposits if not fully funded.
- `tenantMaxContribution(address tenant)` — view helper.

## Notes
- Single-use vault (no reset).
- Only recipient can withdraw/refund.
