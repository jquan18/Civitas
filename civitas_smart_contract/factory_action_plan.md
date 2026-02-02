# Factory Action Plan (Template-Factory Pattern)

This guide outlines how to convert the three templates into **cloneable** contracts and deploy a **CivitasFactory** so the frontend can create instances dynamically.

## Goals
- Use **EIP-1167 minimal proxies (Clones)** for low-cost deployments.
- Replace constructors with `initialize(...)` functions.
- Provide a factory that deploys each template and emits the new clone address.

## Step 1: Convert Templates to Initializable

### 1A) Replace constructor logic
For each template:
- Remove `constructor(...)`.
- Add `initialize(...) external initializer` with the same parameters.
- Move all constructor assignments and validation into `initialize(...)`.

Templates:
- `StableAllowanceTreasury`
- `GroupBuyEscrow`
- `RentVault`

### 1B) Add an initializer guard
Use OpenZeppelin `Initializable`:

```solidity
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";

contract RentVault is Initializable {
  function initialize(...) external initializer { ... }
}
```

Alternatively (simple guard):

```solidity
bool private initialized;
modifier initializer() {
  require(!initialized, "Already initialized");
  initialized = true;
  _;
}
```

## Step 2: Add CivitasFactory (Clones)

Create a factory that stores implementation addresses and deploys clones using `Clones.clone(...)`.

High-level behavior:
- Accept user intent (template type + params).
- Deploy clone.
- Call `initialize(...)`.
- Emit event with clone address.

Factory responsibilities:
- `createRentVault(...)`
- `createGroupBuyEscrow(...)`
- `createStableAllowanceTreasury(...)`

## Step 3: Update Deploy Scripts

Deploy order:
1) Deploy **implementations** (non-clone versions).
2) Deploy **CivitasFactory** with those addresses.

Example sequence:
- `deploy/05_deploy_rent_vault_impl.ts`
- `deploy/06_deploy_group_buy_impl.ts`
- `deploy/07_deploy_stable_treasury_impl.ts`
- `deploy/08_deploy_civitas_factory.ts`

## Step 4: Frontend Integration

Frontend flow:
1) User selects a template and fills a form.
2) Dapp calls `CivitasFactory.createX(...)`.
3) Capture event or tx receipt to get the clone address.
4) Store and render the new instance.

Recommended frontend helpers:
- Listen for `RentVaultCreated`, `GroupBuyCreated`, `TreasuryCreated`.
- Persist clone addresses per user in local storage or DB.

## Step 5: ABI / Types

Ensure the frontend has access to:
- Factory ABI
- Template ABIs
- Deployed addresses

Regenerate after deploy:
```
yarn deploy --tags generateTsAbis --network baseSepolia
```

## Step 6: Notes and Gotchas

- **Initializable only once**: clones must not be re-initialized.
- **State reset**: clones are single-use and independent.
- **USDC address** must be provided per network.
- **Events** are the primary way to learn new clone addresses on the frontend.

## Checklist
- [ ] Constructors removed, `initialize(...)` added in all 3 templates
- [ ] `Initializable` guard in each template
- [ ] CivitasFactory deployed with implementation addresses
- [ ] Frontend calls factory and listens for clone events
- [ ] `deployedContracts.ts` updated after deploy
