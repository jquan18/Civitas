# Contract Deployment & Backend Endpoint Testing Guide

This guide focuses exclusively on contract deployment, storage, and retrieval endpoints for testing the Civitas backend.

---

## Overview

Civitas uses a **hybrid deployment architecture**:
1. **On-Chain Deployment**: Done client-side via wagmi (Web3) hooks
2. **Database Storage**: Backend stores contract metadata in Supabase after deployment
3. **Sync & Retrieval**: Backend provides endpoints to fetch and sync contract state

---

## Current Architecture

### Contract Deployment Flow

```
User Input (AI Chat)
  → Generate Basename (API: /api/generate-name)
  → Predict CREATE2 Address (Client-side)
  → Deploy Contract (Web3: Factory.deployRental)
  → Store in Database (Internal: createContract)
  → Create User Relations (Internal: createUserContractRelation)
```

### Existing Backend Functions (Not HTTP Endpoints)

Currently, contract operations are **internal server functions**, not exposed as HTTP endpoints:

- `createContract()` - Store contract after deployment
- `getUserContracts()` - Fetch user's contracts
- `getContractByAddress()` - Get specific contract
- `updateContract()` - Update contract state
- `getContractsByState()` - Filter by state (Deployed, Active, etc.)
- `searchContractsByBasename()` - Search by basename

---

## Required API Endpoints (To Be Created)

To properly test the backend, you need to create these HTTP endpoints:

### 1. POST /api/contracts/store
Store a deployed contract in the database after on-chain deployment.

### 2. GET /api/contracts
Retrieve all contracts for a user (as landlord or tenant).

### 3. GET /api/contracts/[address]
Get details for a specific contract by address.

### 4. PATCH /api/contracts/[address]
Update contract state (sync from blockchain).

### 5. POST /api/contracts/sync
Sync contract state from blockchain to database.

---

## Endpoint Specifications & Tests

---

## 1. POST /api/contracts/store

### Purpose
Store contract metadata in database after successful on-chain deployment.

### Request

**Endpoint:** `POST {{base_url}}/api/contracts/store`

**Headers:**
```
Content-Type: application/json
```

**Payload:**
```json
{
  "contract_address": "0x1234567890123456789012345678901234567890",
  "landlord_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
  "tenant_address": "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199",
  "basename": "downtown-studio-12mo",
  "monthly_amount": 1500000000,
  "total_months": 12,
  "state": 0,
  "tenant_ens_name": "vitalik.eth"
}
```

**Field Descriptions:**
- `contract_address` **(required)**: The deployed contract address (0x prefixed, 40 hex chars)
- `landlord_address` **(required)**: Landlord's wallet address
- `tenant_address` **(optional)**: Tenant's wallet address (can be null if not set yet)
- `basename` **(required)**: The semantic basename (e.g., "downtown-studio-12mo")
- `monthly_amount` **(required)**: Monthly rent in USDC wei (6 decimals, so 1500 USDC = 1500000000)
- `total_months` **(required)**: Duration in months (1-60)
- `state` **(optional)**: Contract state (default: 0 = Deployed)
  - 0 = Deployed (Ghost 🔴)
  - 1 = Active (Active 🟢)
  - 2 = Completed (Completed ✅)
  - 3 = TerminationPending (Terminating 🟣)
  - 4 = Terminated (Terminated ⚫)
- `tenant_ens_name` **(optional)**: Tenant's ENS name if available

### Expected Response (201 Created)

```json
{
  "success": true,
  "contract": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "contract_address": "0x1234567890123456789012345678901234567890",
    "landlord_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
    "tenant_address": "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199",
    "tenant_ens_name": "vitalik.eth",
    "basename": "downtown-studio-12mo",
    "monthly_amount": 1500000000,
    "total_months": 12,
    "total_amount": 18000000000,
    "state": 0,
    "is_active": false,
    "start_timestamp": null,
    "termination_initiated_at": null,
    "created_at": "2026-02-03T12:00:00.000Z",
    "updated_at": "2026-02-03T12:00:00.000Z",
    "last_synced_at": null
  }
}
```

### Database Changes

**Table: `rental_contracts`**
- **Action:** INSERT

```sql
INSERT INTO rental_contracts (
  id,
  contract_address,
  landlord_address,
  tenant_address,
  tenant_ens_name,
  basename,
  monthly_amount,
  total_months,
  total_amount,
  state,
  is_active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '0x1234567890123456789012345678901234567890',
  '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
  '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
  'vitalik.eth',
  'downtown-studio-12mo',
  1500000000,
  12,
  18000000000, -- calculated: monthly_amount * total_months
  0,
  false,
  NOW(),
  NOW()
);
```

**Table: `user_contracts` (Junction Table)**
- **Action:** INSERT (2 rows)

```sql
-- Landlord relationship
INSERT INTO user_contracts (user_address, contract_address, role)
VALUES ('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1', '0x1234567890123456789012345678901234567890', 'landlord');

-- Tenant relationship
INSERT INTO user_contracts (user_address, contract_address, role)
VALUES ('0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199', '0x1234567890123456789012345678901234567890', 'tenant');
```

**Table: `users`**
- **Action:** UPSERT (if users don't exist)

```sql
INSERT INTO users (wallet_address, ens_name)
VALUES
  ('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1', NULL),
  ('0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199', 'vitalik.eth')
ON CONFLICT (wallet_address) DO NOTHING;
```

### Error Cases

**1. Missing Required Fields (400 Bad Request)**
```json
{
  "error": "contract_address, landlord_address, monthly_amount, total_months, and basename are required"
}
```

**2. Invalid Address Format (400 Bad Request)**
```json
{
  "error": "Invalid contract_address format. Must be 0x followed by 40 hex characters"
}
```

**3. Contract Already Exists (409 Conflict)**
```json
{
  "error": "Contract with address 0x1234...7890 already exists"
}
```

**4. Invalid State Value (400 Bad Request)**
```json
{
  "error": "Invalid state value. Must be 0-4"
}
```

**5. Invalid Monthly Amount (400 Bad Request)**
```json
{
  "error": "monthly_amount must be a positive number"
}
```

**6. Invalid Total Months (400 Bad Request)**
```json
{
  "error": "total_months must be between 1 and 60"
}
```

---

## 2. GET /api/contracts

### Purpose
Retrieve all contracts for a user (as landlord or tenant).

### Request

**Endpoint:** `GET {{base_url}}/api/contracts?user_address=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1`

**Query Parameters:**
- `user_address` **(required)**: User's wallet address
- `state` **(optional)**: Filter by state (0-4)
- `role` **(optional)**: Filter by role ("landlord" or "tenant")

### Test Cases

#### 2.1 Get All User Contracts

**Request:**
```http
GET {{base_url}}/api/contracts?user_address=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1
```

**Expected Response (200 OK):**
```json
{
  "contracts": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "contract_address": "0x1234567890123456789012345678901234567890",
      "landlord_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
      "tenant_address": "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199",
      "tenant_ens_name": "vitalik.eth",
      "basename": "downtown-studio-12mo",
      "monthly_amount": 1500000000,
      "total_months": 12,
      "total_amount": 18000000000,
      "state": 1,
      "is_active": true,
      "start_timestamp": 1706961234,
      "termination_initiated_at": null,
      "created_at": "2026-02-03T12:00:00.000Z",
      "updated_at": "2026-02-03T12:30:00.000Z",
      "last_synced_at": "2026-02-03T12:30:00.000Z",
      "role": "landlord"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "contract_address": "0xabcdef1234567890abcdef1234567890abcdef12",
      "landlord_address": "0x9999999999999999999999999999999999999999",
      "tenant_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
      "tenant_ens_name": "alice.eth",
      "basename": "suburban-house-24mo",
      "monthly_amount": 2000000000,
      "total_months": 24,
      "total_amount": 48000000000,
      "state": 1,
      "is_active": true,
      "start_timestamp": 1706900000,
      "termination_initiated_at": null,
      "created_at": "2026-02-01T10:00:00.000Z",
      "updated_at": "2026-02-03T11:00:00.000Z",
      "last_synced_at": "2026-02-03T11:00:00.000Z",
      "role": "tenant"
    }
  ],
  "total": 2
}
```

**Database Query:**
```sql
SELECT
  rc.*,
  uc.role
FROM rental_contracts rc
INNER JOIN user_contracts uc ON rc.contract_address = uc.contract_address
WHERE uc.user_address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1'
ORDER BY rc.created_at DESC;
```

#### 2.2 Get Contracts by State

**Request:**
```http
GET {{base_url}}/api/contracts?user_address=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1&state=1
```

**Expected Response (200 OK):**
```json
{
  "contracts": [
    {
      "contract_address": "0x1234567890123456789012345678901234567890",
      "state": 1,
      "basename": "downtown-studio-12mo",
      "role": "landlord"
    }
  ],
  "total": 1
}
```

**Database Query:**
```sql
SELECT
  rc.*,
  uc.role
FROM rental_contracts rc
INNER JOIN user_contracts uc ON rc.contract_address = uc.contract_address
WHERE uc.user_address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1'
  AND rc.state = 1
ORDER BY rc.created_at DESC;
```

#### 2.3 Get Contracts by Role

**Request:**
```http
GET {{base_url}}/api/contracts?user_address=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1&role=landlord
```

**Expected Response (200 OK):**
```json
{
  "contracts": [
    {
      "contract_address": "0x1234567890123456789012345678901234567890",
      "basename": "downtown-studio-12mo",
      "role": "landlord"
    }
  ],
  "total": 1
}
```

**Database Query:**
```sql
SELECT
  rc.*,
  uc.role
FROM rental_contracts rc
INNER JOIN user_contracts uc ON rc.contract_address = uc.contract_address
WHERE uc.user_address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1'
  AND uc.role = 'landlord'
ORDER BY rc.created_at DESC;
```

#### 2.4 User with No Contracts

**Request:**
```http
GET {{base_url}}/api/contracts?user_address=0x0000000000000000000000000000000000000000
```

**Expected Response (200 OK):**
```json
{
  "contracts": [],
  "total": 0
}
```

#### 2.5 Missing User Address (Error)

**Request:**
```http
GET {{base_url}}/api/contracts
```

**Expected Response (400 Bad Request):**
```json
{
  "error": "user_address query parameter is required"
}
```

---

## 3. GET /api/contracts/[address]

### Purpose
Get detailed information about a specific contract.

### Request

**Endpoint:** `GET {{base_url}}/api/contracts/0x1234567890123456789012345678901234567890`

**Path Parameter:**
- `address`: Contract address (0x prefixed)

### Test Cases

#### 3.1 Get Contract Details

**Request:**
```http
GET {{base_url}}/api/contracts/0x1234567890123456789012345678901234567890
```

**Expected Response (200 OK):**
```json
{
  "contract": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "contract_address": "0x1234567890123456789012345678901234567890",
    "landlord_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
    "tenant_address": "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199",
    "tenant_ens_name": "vitalik.eth",
    "basename": "downtown-studio-12mo",
    "monthly_amount": 1500000000,
    "total_months": 12,
    "total_amount": 18000000000,
    "state": 1,
    "is_active": true,
    "start_timestamp": 1706961234,
    "termination_initiated_at": null,
    "created_at": "2026-02-03T12:00:00.000Z",
    "updated_at": "2026-02-03T12:30:00.000Z",
    "last_synced_at": "2026-02-03T12:30:00.000Z"
  }
}
```

**Database Query:**
```sql
SELECT * FROM rental_contracts
WHERE contract_address = '0x1234567890123456789012345678901234567890';
```

#### 3.2 Contract Not Found

**Request:**
```http
GET {{base_url}}/api/contracts/0xnonexistent0000000000000000000000000000
```

**Expected Response (404 Not Found):**
```json
{
  "error": "Contract not found"
}
```

---

## 4. PATCH /api/contracts/[address]

### Purpose
Update contract state (typically after syncing from blockchain).

### Request

**Endpoint:** `PATCH {{base_url}}/api/contracts/0x1234567890123456789012345678901234567890`

**Headers:**
```
Content-Type: application/json
```

**Payload (Update to Active State):**
```json
{
  "state": 1,
  "is_active": true,
  "start_timestamp": 1706961234
}
```

### Test Cases

#### 4.1 Update Contract to Active State

**Request:**
```http
PATCH {{base_url}}/api/contracts/0x1234567890123456789012345678901234567890
Content-Type: application/json

{
  "state": 1,
  "is_active": true,
  "start_timestamp": 1706961234
}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "contract": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "contract_address": "0x1234567890123456789012345678901234567890",
    "state": 1,
    "is_active": true,
    "start_timestamp": 1706961234,
    "updated_at": "2026-02-03T12:35:00.000Z",
    "last_synced_at": "2026-02-03T12:35:00.000Z"
  }
}
```

**Database Changes:**
```sql
UPDATE rental_contracts
SET
  state = 1,
  is_active = true,
  start_timestamp = 1706961234,
  updated_at = NOW(),
  last_synced_at = NOW()
WHERE contract_address = '0x1234567890123456789012345678901234567890';
```

#### 4.2 Update Contract to Termination Pending

**Request:**
```http
PATCH {{base_url}}/api/contracts/0x1234567890123456789012345678901234567890
Content-Type: application/json

{
  "state": 3,
  "termination_initiated_at": 1707000000
}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "contract": {
    "state": 3,
    "termination_initiated_at": 1707000000,
    "updated_at": "2026-02-03T13:00:00.000Z",
    "last_synced_at": "2026-02-03T13:00:00.000Z"
  }
}
```

**Database Changes:**
```sql
UPDATE rental_contracts
SET
  state = 3,
  termination_initiated_at = 1707000000,
  updated_at = NOW(),
  last_synced_at = NOW()
WHERE contract_address = '0x1234567890123456789012345678901234567890';
```

#### 4.3 Update Contract to Completed

**Request:**
```http
PATCH {{base_url}}/api/contracts/0x1234567890123456789012345678901234567890
Content-Type: application/json

{
  "state": 2,
  "is_active": false
}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "contract": {
    "state": 2,
    "is_active": false,
    "updated_at": "2026-02-03T14:00:00.000Z"
  }
}
```

---

## 5. POST /api/contracts/sync

### Purpose
Sync contract state from blockchain to database.

### Request

**Endpoint:** `POST {{base_url}}/api/contracts/sync`

**Headers:**
```
Content-Type: application/json
```

**Payload:**
```json
{
  "contract_address": "0x1234567890123456789012345678901234567890",
  "chain_id": 8453
}
```

**Field Descriptions:**
- `contract_address` **(required)**: Contract to sync
- `chain_id` **(optional)**: Chain ID (default: 8453 = Base Mainnet)

### Test Cases

#### 5.1 Sync Contract from Blockchain

**Request:**
```http
POST {{base_url}}/api/contracts/sync
Content-Type: application/json

{
  "contract_address": "0x1234567890123456789012345678901234567890",
  "chain_id": 8453
}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "synced": true,
  "contract": {
    "contract_address": "0x1234567890123456789012345678901234567890",
    "state": 1,
    "is_active": true,
    "start_timestamp": 1706961234,
    "total_paid": 3000000000,
    "last_synced_at": "2026-02-03T15:00:00.000Z"
  },
  "changes": {
    "state": { "from": 0, "to": 1 },
    "is_active": { "from": false, "to": true },
    "start_timestamp": { "from": null, "to": 1706961234 }
  }
}
```

**Backend Process:**
1. Read contract state from blockchain using viem
2. Compare with database state
3. Update database if changes detected
4. Return diff of changes

**Database Changes:**
```sql
UPDATE rental_contracts
SET
  state = 1,
  is_active = true,
  start_timestamp = 1706961234,
  last_synced_at = NOW(),
  updated_at = NOW()
WHERE contract_address = '0x1234567890123456789012345678901234567890';
```

#### 5.2 Sync Contract (No Changes)

**Request:**
```http
POST {{base_url}}/api/contracts/sync
Content-Type: application/json

{
  "contract_address": "0x1234567890123456789012345678901234567890"
}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "synced": true,
  "contract": {
    "contract_address": "0x1234567890123456789012345678901234567890",
    "state": 1,
    "last_synced_at": "2026-02-03T15:05:00.000Z"
  },
  "changes": {}
}
```

**Database Changes:**
```sql
UPDATE rental_contracts
SET last_synced_at = NOW()
WHERE contract_address = '0x1234567890123456789012345678901234567890';
```

#### 5.3 Sync Non-Existent Contract

**Request:**
```http
POST {{base_url}}/api/contracts/sync
Content-Type: application/json

{
  "contract_address": "0xnonexistent0000000000000000000000000000"
}
```

**Expected Response (404 Not Found):**
```json
{
  "error": "Contract not found in database"
}
```

---

## Complete Testing Workflow

### Step 1: Deploy Contract via Web3 (Client-Side)

This happens in the frontend using wagmi:

```typescript
// Generate basename
const response = await fetch('/api/generate-name', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    config: {
      tenant: 'vitalik.eth',
      monthlyAmount: 1500,
      totalMonths: 12
    },
    conversationContext: 'Downtown studio apartment'
  })
});
const { suggestedName } = await response.json();
// Returns: "downtown-studio-12mo"

// Predict address
const predictedAddress = predictRentalAddress(
  landlordAddress,
  suggestedName
);
// Returns: "0x1234567890123456789012345678901234567890"

// Deploy on-chain via wagmi
writeContract({
  address: FACTORY_ADDRESS,
  abi: RENTAL_FACTORY_ABI,
  functionName: 'deployRental',
  args: [
    landlordAddress,
    tenantAddress,
    parseUnits('1500', 6), // 1500 USDC
    12,
    suggestedName
  ]
});
```

### Step 2: Store Contract in Database

**Request:**
```http
POST {{base_url}}/api/contracts/store
Content-Type: application/json

{
  "contract_address": "0x1234567890123456789012345678901234567890",
  "landlord_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
  "tenant_address": "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199",
  "basename": "downtown-studio-12mo",
  "monthly_amount": 1500000000,
  "total_months": 12,
  "state": 0,
  "tenant_ens_name": "vitalik.eth"
}
```

### Step 3: Verify Contract Stored

**Request:**
```http
GET {{base_url}}/api/contracts/0x1234567890123456789012345678901234567890
```

### Step 4: Fund Contract (Client-Side via LI.FI)

User bridges funds to the contract address using LI.FI widget.

### Step 5: Sync Contract State

**Request:**
```http
POST {{base_url}}/api/contracts/sync
Content-Type: application/json

{
  "contract_address": "0x1234567890123456789012345678901234567890"
}
```

**Expected:** Contract state changes from 0 (Deployed) to 1 (Active)

### Step 6: Verify Updated State

**Request:**
```http
GET {{base_url}}/api/contracts/0x1234567890123456789012345678901234567890
```

**Expected:** `state: 1`, `is_active: true`, `start_timestamp` set

### Step 7: Get User's Contracts

**Request:**
```http
GET {{base_url}}/api/contracts?user_address=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1
```

**Expected:** Returns list including the newly created contract

---

## Database Verification Queries

### Check Contract Exists
```sql
SELECT * FROM rental_contracts
WHERE contract_address = '0x1234567890123456789012345678901234567890';
```

### Check User-Contract Relationships
```sql
SELECT * FROM user_contracts
WHERE contract_address = '0x1234567890123456789012345678901234567890';
```

### Check All Contracts for User
```sql
SELECT
  rc.*,
  uc.role
FROM rental_contracts rc
INNER JOIN user_contracts uc ON rc.contract_address = uc.contract_address
WHERE uc.user_address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1';
```

### Check Contracts by State
```sql
SELECT * FROM rental_contracts WHERE state = 1; -- Active contracts
SELECT * FROM rental_contracts WHERE state = 0; -- Deployed (Ghost) contracts
```

### Check Recently Created Contracts
```sql
SELECT * FROM rental_contracts
ORDER BY created_at DESC
LIMIT 10;
```

---

## Postman Collection JSON

```json
{
  "info": {
    "name": "Civitas Contract Endpoints",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3000"
    },
    {
      "key": "test_contract",
      "value": "0x1234567890123456789012345678901234567890"
    },
    {
      "key": "landlord_address",
      "value": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1"
    },
    {
      "key": "tenant_address",
      "value": "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199"
    }
  ],
  "item": [
    {
      "name": "1. Store Contract",
      "request": {
        "method": "POST",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"contract_address\": \"{{test_contract}}\",\n  \"landlord_address\": \"{{landlord_address}}\",\n  \"tenant_address\": \"{{tenant_address}}\",\n  \"basename\": \"downtown-studio-12mo\",\n  \"monthly_amount\": 1500000000,\n  \"total_months\": 12,\n  \"state\": 0,\n  \"tenant_ens_name\": \"vitalik.eth\"\n}"
        },
        "url": "{{base_url}}/api/contracts/store"
      }
    },
    {
      "name": "2. Get All User Contracts",
      "request": {
        "method": "GET",
        "url": "{{base_url}}/api/contracts?user_address={{landlord_address}}"
      }
    },
    {
      "name": "3. Get Contract by Address",
      "request": {
        "method": "GET",
        "url": "{{base_url}}/api/contracts/{{test_contract}}"
      }
    },
    {
      "name": "4. Update Contract State (Activate)",
      "request": {
        "method": "PATCH",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"state\": 1,\n  \"is_active\": true,\n  \"start_timestamp\": 1706961234\n}"
        },
        "url": "{{base_url}}/api/contracts/{{test_contract}}"
      }
    },
    {
      "name": "5. Sync Contract from Blockchain",
      "request": {
        "method": "POST",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"contract_address\": \"{{test_contract}}\",\n  \"chain_id\": 8453\n}"
        },
        "url": "{{base_url}}/api/contracts/sync"
      }
    },
    {
      "name": "6. Get Contracts by State (Active)",
      "request": {
        "method": "GET",
        "url": "{{base_url}}/api/contracts?user_address={{landlord_address}}&state=1"
      }
    },
    {
      "name": "7. Get Contracts by Role (Landlord)",
      "request": {
        "method": "GET",
        "url": "{{base_url}}/api/contracts?user_address={{landlord_address}}&role=landlord"
      }
    }
  ]
}
```

---

## Implementation Checklist

To enable these endpoints, you need to create the following API route files:

- [ ] `frontend/src/app/api/contracts/store/route.ts` - Store contract
- [ ] `frontend/src/app/api/contracts/route.ts` - Get user contracts (GET)
- [ ] `frontend/src/app/api/contracts/[address]/route.ts` - Get/Update contract (GET, PATCH)
- [ ] `frontend/src/app/api/contracts/sync/route.ts` - Sync from blockchain

The backend functions already exist in `frontend/src/lib/supabase/contracts.ts`, you just need to expose them as HTTP endpoints.

---

## Notes

1. **Contract States:**
   - 0 = Deployed (Ghost 🔴) - Contract exists but not funded
   - 1 = Active (Active 🟢) - Fully funded, rent releasing
   - 2 = Completed (Completed ✅) - All rent paid, term finished
   - 3 = TerminationPending (Terminating 🟣) - 30-day notice active
   - 4 = Terminated (Terminated ⚫) - Early termination finalized

2. **USDC Amounts:**
   - USDC has 6 decimals on Base
   - 1 USDC = 1,000,000 wei
   - 1500 USDC = 1,500,000,000 wei
   - Always use `parseUnits(amount, 6)` for conversions

3. **Address Format:**
   - Must be 0x prefixed
   - 40 hexadecimal characters (42 total with 0x)
   - Case-insensitive but checksummed addresses are preferred

4. **Testing Order:**
   - Always test store endpoint first
   - Then test retrieval endpoints
   - Then test update endpoints
   - Finally test sync endpoint

5. **Error Handling:**
   - All endpoints should return appropriate HTTP status codes
   - Include descriptive error messages
   - Log errors server-side for debugging
