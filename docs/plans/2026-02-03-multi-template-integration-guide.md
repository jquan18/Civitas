# 🚀 CIVITAS - COMPLETE MULTI-TEMPLATE INTEGRATION GUIDE

**Version:** 1.1 (ETH HackMoney 2026)
**Date:** February 3, 2026 (Updated with latest commits)
**Project:** Multi-Template Cross-Chain Agreement Platform
**Architecture:** Scalable Template Registry System with Neo-Brutalist UI
**Smart Contracts:** OpenZeppelin Clones (EIP-1167) Factory Pattern

---

## 📋 TABLE OF CONTENTS

1. [System Overview](#1-system-overview)
2. [Database Schema Migration](#2-database-schema-migration)
3. [Backend Template System](#3-backend-template-system)
4. [Backend API Implementation](#4-backend-api-implementation)
5. [Frontend Integration](#5-frontend-integration)
6. [AI Chat Integration](#6-ai-chat-integration)
7. [Deployment Checklist](#7-deployment-checklist)
8. [Adding New Templates](#8-adding-new-templates-3-steps)
9. [Testing Guide](#9-testing-guide)

---

## 1. SYSTEM OVERVIEW

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER INTERFACE (Neo-Brutalist)               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Navigation   │  │ Chat         │  │ Receipt Card         │  │
│  │ Rail (88px)  │  │ Interface    │  │ (Contract Preview)   │  │
│  │              │  │ (45%)        │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
         ┌──────▼──────┐            ┌──────▼──────┐
         │  Next.js    │            │  Express    │
         │  API Routes │            │  Backend    │
         │  (AI Chat)  │            │  (Data)     │
         └──────┬──────┘            └──────┬──────┘
                │                           │
         ┌──────▼──────┐            ┌──────▼──────┐
         │   Gemini    │            │  Template   │
         │   AI SDK    │            │  Registry   │
         └─────────────┘            └──────┬──────┘
                                            │
                                    ┌───────▼───────┐
                                    │   Supabase    │
                                    │  (PostgreSQL) │
                                    └───────────────┘
```

### Data Flow

```
User Chat → AI Detection → Template Selection → Parameter Extraction
    ↓
Receipt Card Preview → User Confirms → Deploy Transaction
    ↓
Blockchain Event → Backend Listener → Supabase Sync → Frontend Update
    ↓
Cron Jobs → State Monitoring → Automated Actions
```

### Hybrid Architecture Decision

**Why Split Frontend and Backend?**

| Component | Location | Reason |
|-----------|----------|--------|
| **AI Chat** | Next.js API Routes | Streaming support, Vercel AI SDK optimized, real-time UX |
| **Contract Data** | Express Backend | Long-running services, blockchain sync, cron jobs |
| **Database** | Supabase (JSONB) | Flexible schema, **no migrations per template** |
| **Template Registry** | Shared interfaces | Single source of truth, type-safe |
| **UI** | Next.js with Neo-Brutalism | "Loud Finance" brand, tactile interactions |

---

## 2. DATABASE SCHEMA MIGRATION

### Migration File Location

**File:** `supabase/migrations/20260203_multi_template_support.sql`

### Core Tables

#### 1. `contracts` - Parent Table (All Templates)

```sql
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address TEXT NOT NULL,
  chain_id INTEGER NOT NULL DEFAULT 8453,
  template_id TEXT NOT NULL, -- 'rent-vault', 'group-buy-escrow', etc.
  creator_address TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  tx_hash TEXT,
  suggested_name TEXT,
  basename TEXT,

  CONSTRAINT contracts_address_chain_unique UNIQUE(address, chain_id)
);

CREATE INDEX idx_contracts_creator ON contracts(creator_address);
CREATE INDEX idx_contracts_template ON contracts(template_id);
CREATE INDEX idx_contracts_address ON contracts(address);
```

**Why This Design?**
- ✅ All contract types share common fields
- ✅ Easy to query all contracts regardless of type
- ✅ Enforces unique address per chain
- ✅ Fast lookups by creator or template

#### 2. `contract_metadata` - Flexible JSONB Storage

```sql
CREATE TABLE contract_metadata (
  contract_id UUID PRIMARY KEY REFERENCES contracts(id) ON DELETE CASCADE,
  metadata JSONB NOT NULL DEFAULT '{}',
  last_synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- GIN index for fast JSONB queries
CREATE INDEX idx_metadata_gin ON contract_metadata USING GIN (metadata);
```

**Why JSONB?**
- ✅ **No migrations for new templates** - Just add to JSON
- ✅ **Fast queries** - GIN index enables WHERE metadata->>'field' = 'value'
- ✅ **Type safety** - Validated by Zod schemas in code
- ✅ **Flexible** - Any JSON structure works

**Example Metadata:**

**RentVault:**
```json
{
  "recipient": "0xABC...",
  "rentAmount": "1000000000",
  "dueDate": "1738540800",
  "totalDeposited": "500000000",
  "withdrawn": false,
  "tenants": [
    {"address": "0xDEF...", "shareBps": 5000, "balance": "250000000"},
    {"address": "0x123...", "shareBps": 5000, "balance": "250000000"}
  ]
}
```

**GroupBuyEscrow:**
```json
{
  "recipient": "0xABC...",
  "fundingGoal": "10000000000",
  "expiryDate": "1740960000",
  "timelockRefundDelay": "604800",
  "totalDeposited": "5000000000",
  "goalReachedAt": "0",
  "deliveryConfirmedAt": "0",
  "deliveryProof": "",
  "released": false,
  "yesVotes": 0,
  "participantCount": 2,
  "participants": [
    {"address": "0x123...", "shareBps": 5000, "depositAmount": "2500000000", "hasVoted": false},
    {"address": "0x456...", "shareBps": 5000, "depositAmount": "2500000000", "hasVoted": false}
  ]
}
```

**StableAllowanceTreasury:**
```json
{
  "owner": "0xABC...",
  "recipient": "0xDEF...",
  "allowancePerIncrement": "1000000",
  "approvalCounter": 5,
  "claimedCount": 2,
  "state": "Active",
  "balance": "3000000"
}
```

#### 3. Updated Tables

**`contract_events` - Blockchain Events Log**
```sql
ALTER TABLE contract_events ADD COLUMN contract_id UUID REFERENCES contracts(id);
CREATE INDEX idx_events_contract ON contract_events(contract_id);
```

**`user_contracts` - Junction Table with Extended Roles**
```sql
ALTER TABLE user_contracts ADD COLUMN contract_id UUID REFERENCES contracts(id);
ALTER TABLE user_contracts ADD CONSTRAINT user_contracts_role_check
  CHECK (role IN ('recipient', 'tenant', 'creator', 'participant', 'owner'));
```

**`chat_sessions` - Template Tracking**
```sql
ALTER TABLE chat_sessions ADD COLUMN contract_id UUID REFERENCES contracts(id);
ALTER TABLE chat_sessions ADD COLUMN template_id TEXT;
CREATE INDEX idx_chat_sessions_template ON chat_sessions(template_id);
```

### Helper Views

**View: All Contracts with Metadata**
```sql
CREATE OR REPLACE VIEW contracts_with_metadata AS
SELECT
  c.id,
  c.address,
  c.chain_id,
  c.template_id,
  c.creator_address,
  c.created_at,
  c.tx_hash,
  c.suggested_name,
  c.basename,
  cm.metadata,
  cm.last_synced_at
FROM contracts c
LEFT JOIN contract_metadata cm ON cm.contract_id = c.id;
```

### Helper Functions

**Get User Role:**
```sql
CREATE OR REPLACE FUNCTION get_user_role(
  p_contract_id UUID,
  p_user_address TEXT
) RETURNS TEXT[] AS $$
DECLARE
  v_roles TEXT[];
  v_template_id TEXT;
  v_metadata JSONB;
BEGIN
  SELECT c.template_id, cm.metadata
  INTO v_template_id, v_metadata
  FROM contracts c
  LEFT JOIN contract_metadata cm ON cm.contract_id = c.id
  WHERE c.id = p_contract_id;

  v_roles := ARRAY[]::TEXT[];

  -- Check creator
  IF EXISTS (
    SELECT 1 FROM contracts
    WHERE id = p_contract_id AND creator_address = p_user_address
  ) THEN
    v_roles := array_append(v_roles, 'creator');
  END IF;

  -- Template-specific checks
  CASE v_template_id
    WHEN 'rent-vault' THEN
      IF v_metadata->>'recipient' = p_user_address THEN
        v_roles := array_append(v_roles, 'recipient');
      END IF;
      -- Check tenants array
      IF v_metadata->'tenants' IS NOT NULL THEN
        FOR i IN 0..jsonb_array_length(v_metadata->'tenants')-1 LOOP
          IF v_metadata->'tenants'->i->>'address' = p_user_address THEN
            v_roles := array_append(v_roles, 'tenant');
            EXIT;
          END IF;
        END LOOP;
      END IF;
    WHEN 'group-buy-escrow' THEN
      IF v_metadata->>'recipient' = p_user_address THEN
        v_roles := array_append(v_roles, 'recipient');
      END IF;
      -- Check participants array
      IF v_metadata->'participants' IS NOT NULL THEN
        FOR i IN 0..jsonb_array_length(v_metadata->'participants')-1 LOOP
          IF v_metadata->'participants'->i->>'address' = p_user_address THEN
            v_roles := array_append(v_roles, 'participant');
            EXIT;
          END IF;
        END LOOP;
      END IF;
    WHEN 'stable-allowance-treasury' THEN
      IF v_metadata->>'owner' = p_user_address THEN
        v_roles := array_append(v_roles, 'owner');
      END IF;
      IF v_metadata->>'recipient' = p_user_address THEN
        v_roles := array_append(v_roles, 'recipient');
      END IF;
  END CASE;

  RETURN v_roles;
END;
$$ LANGUAGE plpgsql STABLE;
```

### Query Examples

```sql
-- Get all contracts with metadata
SELECT * FROM contracts_with_metadata
WHERE creator_address = '0x...';

-- Get user's contracts with roles
SELECT * FROM user_contracts_expanded
WHERE user_address = '0x...';

-- Query by metadata fields
SELECT * FROM contract_metadata
WHERE metadata->>'state' = '1'  -- Active contracts
  AND (metadata->>'monthlyAmount')::BIGINT > 1000000;  -- > 1 USDC

-- Get contracts by template
SELECT * FROM contracts_with_metadata
WHERE template_id = 'rent-vault';
```

### Apply Migration

```bash
# Local development
npx supabase db reset

# Production
npx supabase db push
```

---

## 3. BACKEND TEMPLATE SYSTEM

### Directory Structure

```
backend/src/templates/
├── base/
│   └── TemplateDefinition.ts      # Interface all templates implement
├── registry.ts                    # Central registry
├── rent-vault/
│   ├── definition.ts              # Template config
│   ├── abi.ts                     # Contract ABI
│   └── schema.ts                  # Zod schemas
├── group-buy-escrow/
│   ├── definition.ts
│   ├── abi.ts
│   └── schema.ts
└── stable-allowance-treasury/
    ├── definition.ts
    ├── abi.ts
    └── schema.ts

contracts/                          # Smart Contracts (Foundry)
├── src/
│   ├── CivitasFactory.sol         # Unified factory for all templates
│   ├── RentVault.sol              # Multi-tenant rent vault
│   ├── GroupBuyEscrow.sol         # Group buy with voting
│   └── StableAllowanceTreasury.sol # Allowance treasury
├── script/
│   └── DeployCivitasFactory.s.sol # Deployment script
└── test/
    ├── RentVault.t.sol
    ├── GroupBuyEscrow.t.sol
    └── StableAllowanceTreasury.t.sol
```

### Base Template Definition

**File:** `backend/src/templates/base/TemplateDefinition.ts`

```typescript
import type { Abi, Address } from 'viem'
import type { z } from 'zod'

export interface TemplateDefinition {
  // ============================================
  // Basic Info
  // ============================================
  id: string                           // 'rent-vault'
  name: string                         // 'Rent Vault'
  description: string                  // 'Recurring rent payments...'
  category: 'finance' | 'governance' | 'escrow' | 'utility'

  // ============================================
  // Contract Info
  // ============================================
  abi: Abi
  implementationAddress?: Address      // If using factory pattern

  // ============================================
  // AI Detection
  // ============================================
  keywords: string[]                   // ['rent', 'landlord', 'tenant', 'monthly']
  intentPatterns: RegExp[]            // [/rent.*apartment/i, /lease.*property/i]

  // ============================================
  // Schema (Validation & AI Extraction)
  // ============================================
  parameterSchema: z.ZodObject<any>   // For deployment params
  metadataSchema: z.ZodObject<any>    // For database storage

  // ============================================
  // Blockchain Sync
  // ============================================
  readContractState: (address: Address) => Promise<Record<string, any>>

  // ============================================
  // UI Hints
  // ============================================
  dashboardFields: TemplateField[]    // What to display in dashboard
  actionButtons: TemplateAction[]     // What actions users can take

  // ============================================
  // Roles (for RLS and filtering)
  // ============================================
  roles: string[]                     // ['recipient', 'tenant']
  getUserRole: (userAddress: Address, contractData: any) => string[]
}

export interface TemplateField {
  key: string                         // 'monthlyAmount'
  label: string                       // 'Monthly Rent'
  type: 'address' | 'amount' | 'date' | 'state' | 'text' | 'progress'
  format?: (value: any) => string     // Optional formatter
}

export interface TemplateAction {
  id: string                          // 'deposit-share'
  label: string                       // 'Deposit Share'
  description: string                 // 'Deposit your share of rent'
  functionName: string                // 'deposit'
  requiresRole?: string[]             // ['tenant']
  enabledWhen?: (contractData: any) => boolean  // Conditional enabling
}
```

### Example: RentVault Template (Updated for Current Implementation)

**File:** `backend/src/templates/rent-vault/definition.ts`

```typescript
import { z } from 'zod'
import { RENT_VAULT_ABI } from './abi'
import { publicClient } from '@/config/blockchain'
import type { TemplateDefinition } from '../base/TemplateDefinition'
import type { Address } from 'viem'

export const RentVaultTemplate: TemplateDefinition = {
  // ============================================
  // Basic Info
  // ============================================
  id: 'rent-vault',
  name: 'Rent Vault',
  description: 'Multi-tenant rent collection with share-based contributions',
  category: 'finance',

  // ============================================
  // Contract Info
  // ============================================
  abi: RENT_VAULT_ABI,

  // ============================================
  // AI Detection Patterns
  // ============================================
  keywords: ['rent', 'tenant', 'roommate', 'apartment', 'property', 'share', 'split'],
  intentPatterns: [
    /rent.*(?:apartment|house|property)/i,
    /split.*rent/i,
    /(?:tenant|roommate).*(?:pay|rent|share)/i,
    /share.*rent/i,
  ],

  // ============================================
  // Parameter Schema (for AI extraction & deployment)
  // ============================================
  parameterSchema: z.object({
    recipient: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid recipient address'),
    rentAmount: z.bigint().positive('Rent amount must be positive'),
    dueDate: z.bigint().positive('Due date must be in the future'),
    tenants: z.array(z.string().regex(/^0x[a-fA-F0-9]{40}$/)).min(1, 'At least one tenant required'),
    shareBps: z.array(z.number().int().positive()).min(1, 'Share basis points required'),
  }),

  // ============================================
  // Metadata Schema (for database storage)
  // ============================================
  metadataSchema: z.object({
    recipient: z.string(),
    rentAmount: z.string(), // Store as string to avoid precision loss
    dueDate: z.string(),
    totalDeposited: z.string(),
    withdrawn: z.boolean(),
    tenants: z.array(z.object({
      address: z.string(),
      shareBps: z.number(),
      balance: z.string(),
    })),
  }),

  // ============================================
  // Blockchain Reader
  // ============================================
  readContractState: async (address: Address) => {
    const [
      recipient,
      rentAmount,
      dueDate,
      totalDeposited,
      withdrawn,
    ] = await Promise.all([
      publicClient.readContract({
        address,
        abi: RENT_VAULT_ABI,
        functionName: 'recipient',
      }),
      publicClient.readContract({
        address,
        abi: RENT_VAULT_ABI,
        functionName: 'rentAmount',
      }),
      publicClient.readContract({
        address,
        abi: RENT_VAULT_ABI,
        functionName: 'dueDate',
      }),
      publicClient.readContract({
        address,
        abi: RENT_VAULT_ABI,
        functionName: 'totalDeposited',
      }),
      publicClient.readContract({
        address,
        abi: RENT_VAULT_ABI,
        functionName: 'withdrawn',
      }),
    ])

    // Note: Tenant details (balances, shares) need to be fetched from events or stored separately
    return {
      recipient: recipient as string,
      rentAmount: (rentAmount as bigint).toString(),
      dueDate: (dueDate as bigint).toString(),
      totalDeposited: (totalDeposited as bigint).toString(),
      withdrawn: withdrawn as boolean,
      tenants: [], // Would be populated from deployment events or metadata
    }
  },

  // ============================================
  // Dashboard Fields
  // ============================================
  dashboardFields: [
    {
      key: 'recipient',
      label: 'Recipient (Landlord)',
      type: 'address',
    },
    {
      key: 'rentAmount',
      label: 'Total Rent',
      type: 'amount',
    },
    {
      key: 'totalDeposited',
      label: 'Deposited',
      type: 'amount',
    },
    {
      key: 'dueDate',
      label: 'Due Date',
      type: 'date',
    },
    {
      key: 'withdrawn',
      label: 'Status',
      type: 'state',
      format: (value) => value ? 'Withdrawn ✅' : 'Pending 🟡',
    },
  ],

  // ============================================
  // Action Buttons
  // ============================================
  actionButtons: [
    {
      id: 'deposit',
      label: 'Deposit Share',
      description: 'Deposit your share of rent',
      functionName: 'deposit',
      requiresRole: ['tenant'],
      enabledWhen: (data) => !data.withdrawn && data.totalDeposited < data.rentAmount,
    },
    {
      id: 'withdraw',
      label: 'Withdraw to Recipient',
      description: 'Withdraw fully funded rent to landlord',
      functionName: 'withdrawToRecipient',
      requiresRole: ['recipient'],
      enabledWhen: (data) => !data.withdrawn && data.totalDeposited === data.rentAmount,
    },
    {
      id: 'refund-all',
      label: 'Refund All Tenants',
      description: 'Refund all deposits if not fully funded',
      functionName: 'refundAll',
      requiresRole: ['recipient'],
      enabledWhen: (data) => !data.withdrawn && data.totalDeposited < data.rentAmount,
    },
  ],

  // ============================================
  // Roles
  // ============================================
  roles: ['recipient', 'tenant'],

  getUserRole: (userAddress: Address, contractData: any) => {
    const roles: string[] = []
    if (contractData.recipient?.toLowerCase() === userAddress.toLowerCase()) {
      roles.push('recipient')
    }
    if (contractData.tenants?.some((t: any) => t.address.toLowerCase() === userAddress.toLowerCase())) {
      roles.push('tenant')
    }
    return roles
  },
}
```

### Template Registry

**File:** `backend/src/templates/registry.ts`

```typescript
import type { TemplateDefinition } from './base/TemplateDefinition'
import { RentVaultTemplate } from './rent-vault/definition'
import { GroupBuyEscrowTemplate } from './group-buy-escrow/definition'
import { StableAllowanceTreasuryTemplate } from './stable-allowance-treasury/definition'

class TemplateRegistry {
  private templates = new Map<string, TemplateDefinition>()

  constructor() {
    // Auto-register all templates
    this.register(RentVaultTemplate)
    this.register(GroupBuyEscrowTemplate)
    this.register(StableAllowanceTreasuryTemplate)
  }

  /**
   * Register a new template
   */
  register(template: TemplateDefinition) {
    this.templates.set(template.id, template)
  }

  /**
   * Get template by ID
   */
  get(id: string): TemplateDefinition | undefined {
    return this.templates.get(id)
  }

  /**
   * Get all registered templates
   */
  getAll(): TemplateDefinition[] {
    return Array.from(this.templates.values())
  }

  /**
   * Detect template from user's message
   */
  detectFromIntent(userMessage: string): TemplateDefinition | null {
    const message = userMessage.toLowerCase()

    // Check each template's patterns
    for (const template of this.templates.values()) {
      // Check keywords
      const hasKeyword = template.keywords.some((keyword) =>
        message.includes(keyword.toLowerCase())
      )

      // Check regex patterns
      const matchesPattern = template.intentPatterns.some((pattern) =>
        pattern.test(userMessage)
      )

      if (hasKeyword || matchesPattern) {
        return template
      }
    }

    return null
  }

  /**
   * Get templates by category
   */
  getByCategory(category: string): TemplateDefinition[] {
    return Array.from(this.templates.values()).filter(
      (t) => t.category === category
    )
  }

  /**
   * Search templates by keyword
   */
  search(query: string): TemplateDefinition[] {
    const lowerQuery = query.toLowerCase()
    return Array.from(this.templates.values()).filter(
      (t) =>
        t.name.toLowerCase().includes(lowerQuery) ||
        t.description.toLowerCase().includes(lowerQuery) ||
        t.keywords.some((k) => k.toLowerCase().includes(lowerQuery))
    )
  }
}

export const templateRegistry = new TemplateRegistry()
```

---

## 4. BACKEND API IMPLEMENTATION

### Generic Sync Service

**File:** `backend/src/services/blockchain/genericSync.ts`

```typescript
import { templateRegistry } from '@/templates/registry'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/utils/logger'
import type { Address } from 'viem'

/**
 * Generic contract sync - works for ANY template
 */
export async function syncContractGeneric(contractAddress: Address) {
  // 1. Get contract from DB to know its template type
  const { data: contract, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('address', contractAddress)
    .single()

  if (error || !contract) {
    throw new Error('Contract not found in database')
  }

  logger.info('Syncing contract', {
    address: contractAddress,
    templateId: contract.template_id,
  })

  // 2. Get template definition
  const template = templateRegistry.get(contract.template_id)

  if (!template) {
    throw new Error(`Unknown template: ${contract.template_id}`)
  }

  // 3. Read state from blockchain using template's reader
  const blockchainData = await template.readContractState(contractAddress)

  // 4. Validate with template's schema
  const validatedData = template.metadataSchema.parse(blockchainData)

  // 5. Upsert to contract_metadata
  const { error: upsertError } = await supabase
    .from('contract_metadata')
    .upsert({
      contract_id: contract.id,
      metadata: validatedData,
      last_synced_at: new Date().toISOString(),
    })

  if (upsertError) {
    throw new Error(`Failed to update metadata: ${upsertError.message}`)
  }

  logger.info('Contract synced successfully', {
    address: contractAddress,
    state: validatedData.state,
  })

  return { contract, metadata: validatedData }
}
```

### API Routes

**File:** `backend/src/routes/contracts.ts`

```typescript
import { Router, Request, Response } from 'express'
import { templateRegistry } from '@/templates/registry'
import { syncContractGeneric } from '@/services/blockchain/genericSync'
import { asyncHandler } from '@/utils/asyncHandler'
import { ValidationError } from '@/utils/errors'
import { logger } from '@/utils/logger'
import { supabase } from '@/lib/supabase/client'
import type { Address } from 'viem'

const router: Router = Router()

// ============================================
// GET /api/contracts
// List user's contracts with optional filters
// ============================================
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { userAddress, type, role } = req.query

    if (!userAddress || typeof userAddress !== 'string') {
      throw new ValidationError('User address required')
    }

    logger.info('Fetching user contracts', { userAddress, type, role })

    let query = supabase
      .from('contracts')
      .select(`*, contract_metadata(metadata)`)
      .eq('creator_address', userAddress)

    if (type) {
      query = query.eq('template_id', type)
    }

    const { data: contracts, error } = await query

    if (error) {
      throw new Error(`Failed to fetch contracts: ${error.message}`)
    }

    res.json({ contracts: contracts || [], count: contracts?.length || 0 })
  })
)

// ============================================
// GET /api/contracts/:address
// Get single contract with template metadata
// ============================================
router.get(
  '/:address',
  asyncHandler(async (req: Request, res: Response) => {
    const { address } = req.params

    if (!address) {
      throw new ValidationError('Contract address required')
    }

    logger.info('Fetching contract details', { address })

    const { data: contract, error } = await supabase
      .from('contracts')
      .select(`*, contract_metadata(metadata)`)
      .eq('address', address)
      .single()

    if (error || !contract) {
      return res.status(404).json({ error: 'Contract not found' })
    }

    // Add template metadata for frontend
    const template = templateRegistry.get(contract.template_id)

    if (!template) {
      return res.status(500).json({ error: 'Unknown template type' })
    }

    res.json({
      contract,
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        category: template.category,
        dashboardFields: template.dashboardFields,
        actionButtons: template.actionButtons,
        roles: template.roles,
      },
    })
  })
)

// ============================================
// POST /api/contracts/sync
// Manually trigger contract sync
// ============================================
router.post(
  '/sync',
  asyncHandler(async (req: Request, res: Response) => {
    const { contractAddress } = req.body

    if (!contractAddress) {
      throw new ValidationError('Contract address required')
    }

    logger.info('Manual contract sync requested', { contractAddress })

    const result = await syncContractGeneric(contractAddress as Address)

    res.json({ contract: result })
  })
)

// ============================================
// POST /api/contracts/create
// Record newly deployed contract
// ============================================
router.post(
  '/create',
  asyncHandler(async (req: Request, res: Response) => {
    const {
      address,
      chainId,
      templateId,
      creatorAddress,
      txHash,
      suggestedName,
    } = req.body

    if (!address || !templateId || !creatorAddress) {
      throw new ValidationError(
        'Missing required fields: address, templateId, creatorAddress'
      )
    }

    // Validate template exists
    const template = templateRegistry.get(templateId)
    if (!template) {
      throw new ValidationError(`Unknown template: ${templateId}`)
    }

    logger.info('Creating new contract record', { address, templateId })

    const { data: contract, error } = await supabase
      .from('contracts')
      .insert({
        address,
        chain_id: chainId || 8453,
        template_id: templateId,
        creator_address: creatorAddress,
        tx_hash: txHash,
        suggested_name: suggestedName,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create contract: ${error.message}`)
    }

    // Trigger initial sync to populate metadata
    try {
      await syncContractGeneric(address as Address)
    } catch (syncError) {
      logger.warn('Initial sync failed, will retry later', { syncError })
    }

    res.json({ contract })
  })
)

// ============================================
// GET /api/templates
// List all available templates
// ============================================
router.get('/templates', (req: Request, res: Response) => {
  const templates = templateRegistry.getAll().map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    category: t.category,
    keywords: t.keywords,
    dashboardFields: t.dashboardFields,
    actionButtons: t.actionButtons,
    roles: t.roles,
  }))

  res.json({ templates })
})

export default router
```

### Update Main Router

**File:** `backend/src/routes/index.ts`

```typescript
import { Router } from 'express'
import healthRouter from './health'
import contractsRouter from './contracts'

const router: Router = Router()

router.use('/health', healthRouter)
router.use('/api/contracts', contractsRouter)
router.use('/api/templates', contractsRouter) // Shares /api/templates endpoint

export default router
```

---

## 5. FRONTEND INTEGRATION

### Template Registry Hook

**File:** `frontend/src/hooks/useTemplateRegistry.ts`

```typescript
import { useState, useEffect } from 'react'
import type { TemplateDefinition } from '@/lib/templates/types'

export function useTemplateRegistry() {
  const [templates, setTemplates] = useState<TemplateDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/templates`
        )

        if (!res.ok) {
          throw new Error('Failed to fetch templates')
        }

        const data = await res.json()
        setTemplates(data.templates)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchTemplates()
  }, [])

  const getTemplate = (id: string) => {
    return templates.find((t) => t.id === id)
  }

  const getByCategory = (category: string) => {
    return templates.filter((t) => t.category === category)
  }

  return { templates, loading, error, getTemplate, getByCategory }
}
```

### Template Selector (Neo-Brutalist)

**File:** `frontend/src/components/chat/TemplateSelector.tsx`

```typescript
'use client'

import { useState } from 'react'
import {
  Building2,
  Users,
  Wallet,
  LayoutGrid,
  Sparkles,
} from 'lucide-react'
import type { TemplateDefinition } from '@/lib/templates/types'

interface TemplateSelectorProps {
  templates: TemplateDefinition[]
  onSelect: (templateId: string) => void
}

const categoryIcons = {
  finance: Wallet,
  governance: Users,
  escrow: Building2,
  utility: LayoutGrid,
}

export function TemplateSelector({
  templates,
  onSelect,
}: TemplateSelectorProps) {
  const [pressedId, setPressedId] = useState<string | null>(null)

  return (
    <div className="mb-8">
      {/* Header - LOUD */}
      <div className="mb-6">
        <h2 className="font-black text-3xl uppercase tracking-tight mb-2">
          /// SELECT TEMPLATE
        </h2>
        <p className="font-mono text-sm">
          OR TYPE FREELY — AI DETECTS INTENT AUTOMATICALLY
        </p>
      </div>

      {/* Grid of Template Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => {
          const Icon = categoryIcons[template.category] || LayoutGrid
          const isPressed = pressedId === template.id

          return (
            <button
              key={template.id}
              onClick={() => onSelect(template.id)}
              onMouseDown={() => setPressedId(template.id)}
              onMouseUp={() => setPressedId(null)}
              onMouseLeave={() => setPressedId(null)}
              className={`
                group relative bg-white border-[3px] border-black p-6 text-left
                transition-all duration-75 cursor-pointer
                ${
                  isPressed
                    ? 'translate-x-[4px] translate-y-[4px] shadow-none'
                    : 'shadow-[4px_4px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000]'
                }
              `}
            >
              {/* Category Badge - Top Right */}
              <div className="absolute top-4 right-4 bg-[#FFD600] border-2 border-black px-2 py-1">
                <span className="font-mono text-xs uppercase font-bold">
                  {template.category}
                </span>
              </div>

              {/* Icon */}
              <div className="mb-4 w-12 h-12 bg-[#CCFF00] border-2 border-black flex items-center justify-center">
                <Icon className="w-6 h-6" />
              </div>

              {/* Title */}
              <h3 className="font-black text-xl uppercase mb-2 tracking-tight">
                {template.name}
              </h3>

              {/* Description */}
              <p className="font-mono text-sm leading-relaxed mb-4 line-clamp-2">
                {template.description}
              </p>

              {/* Keywords */}
              <div className="flex flex-wrap gap-2">
                {template.keywords.slice(0, 3).map((keyword) => (
                  <span
                    key={keyword}
                    className="border border-black px-2 py-0.5 font-mono text-xs uppercase"
                  >
                    {keyword}
                  </span>
                ))}
                {template.keywords.length > 3 && (
                  <span className="border border-black px-2 py-0.5 font-mono text-xs uppercase">
                    +{template.keywords.length - 3}
                  </span>
                )}
              </div>

              {/* Action Indicator */}
              <div className="mt-4 flex items-center gap-2 font-black text-sm">
                <span>&gt;&gt;&gt;</span>
                <span className="uppercase">SELECT</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* AI Note */}
      <div className="mt-6 bg-[#CCFF00] border-[3px] border-black p-4">
        <p className="font-mono text-sm">
          <span className="font-black">[AI ASSIST]</span> Don't see your use
          case? Just start typing. The agent will auto-detect the best template.
        </p>
      </div>
    </div>
  )
}
```

### Contract Receipt Card

**File:** `frontend/src/components/contract/ContractReceiptCard.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import type { TemplateDefinition } from '@/lib/templates/types'

interface ContractReceiptCardProps {
  template: TemplateDefinition
  config: any
  onDeploy?: () => void
}

export function ContractReceiptCard({
  template,
  config,
  onDeploy,
}: ContractReceiptCardProps) {
  const [completeness, setCompleteness] = useState(0)
  const [isPressed, setIsPressed] = useState(false)

  // Calculate form completeness
  useEffect(() => {
    const requiredFields = Object.keys(template.parameterSchema?.shape || {})
    const filledFields = requiredFields.filter((key) => config[key])
    const percentage = (filledFields.length / requiredFields.length) * 100
    setCompleteness(percentage)
  }, [config, template])

  const formatValue = (field: any, value: any) => {
    if (!value) return '---'

    switch (field.type) {
      case 'address':
        return value.slice(0, 10) + '...' + value.slice(-8)
      case 'amount':
        return (
          (Number(value) / 1e6).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }) + ' USDC'
        )
      case 'date':
        return new Date(Number(value) * 1000).toLocaleDateString()
      case 'state':
        const states = [
          'DEPLOYED',
          'ACTIVE',
          'COMPLETED',
          'TERMINATING',
          'TERMINATED',
        ]
        return states[value] || value
      default:
        return field.format ? field.format(value) : String(value)
    }
  }

  const isComplete = completeness === 100

  return (
    <div className="sticky top-24 w-full max-w-md mx-auto">
      {/* Receipt Card with Jagged Bottom */}
      <div
        className="bg-white border-[3px] border-black border-b-0 shadow-[6px_6px_0px_#000] animate-receipt-print"
        style={{
          clipPath:
            'polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 6px) calc(100% - 6px), calc(100% - 12px) 100%, calc(100% - 18px) calc(100% - 6px), calc(100% - 24px) 100%, calc(100% - 30px) calc(100% - 6px), calc(100% - 36px) 100%, calc(100% - 42px) calc(100% - 6px), calc(100% - 48px) 100%, calc(100% - 54px) calc(100% - 6px), calc(100% - 60px) 100%, calc(100% - 66px) calc(100% - 6px), calc(100% - 72px) 100%, calc(100% - 78px) calc(100% - 6px), calc(100% - 84px) 100%, calc(100% - 90px) calc(100% - 6px), calc(100% - 96px) 100%, calc(100% - 102px) calc(100% - 6px), calc(100% - 108px) 100%, calc(100% - 114px) calc(100% - 6px), calc(100% - 120px) 100%, 0 100%)',
        }}
      >
        {/* Header */}
        <div className="p-6 border-b-2 border-dashed border-black">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-black text-2xl uppercase tracking-tight">
              RECEIPT
            </h3>
            <div className="bg-black text-white px-3 py-1 font-mono text-xs">
              {new Date().toISOString().split('T')[0]}
            </div>
          </div>
          <div className="font-mono text-sm">
            TEMPLATE: {template.name.toUpperCase()}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-xs uppercase font-bold">
              COMPLETION
            </span>
            <span className="font-mono text-xs font-bold">
              {completeness.toFixed(0)}%
            </span>
          </div>
          <div className="h-2 bg-[#FAF9F6] border border-black">
            <div
              className="h-full bg-[#CCFF00] transition-all duration-300"
              style={{ width: `${completeness}%` }}
            />
          </div>
        </div>

        {/* Parameters */}
        <div className="p-6 space-y-4">
          {template.dashboardFields.map((field, index) => {
            const value = config[field.key]
            const hasValue =
              value !== undefined && value !== null && value !== ''

            return (
              <div key={field.key}>
                {/* Field Row */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 flex-1">
                    {hasValue ? (
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 flex-shrink-0 opacity-30" />
                    )}
                    <span className="font-mono text-xs uppercase font-bold">
                      {field.label}
                    </span>
                  </div>
                  <span
                    className={`font-mono text-sm text-right ${
                      hasValue ? 'font-bold' : 'opacity-30'
                    }`}
                  >
                    {formatValue(field, value)}
                  </span>
                </div>

                {/* Dashed divider */}
                {index < template.dashboardFields.length - 1 && (
                  <div className="border-b border-dashed border-black mt-4" />
                )}
              </div>
            )
          })}
        </div>

        {/* Total Section (if rent vault) */}
        {config.monthlyAmount && config.totalMonths && (
          <>
            <div className="border-t-2 border-dashed border-black" />
            <div className="bg-black text-white p-6">
              <div className="flex items-center justify-between">
                <span className="font-black text-lg uppercase tracking-tight">
                  TOTAL
                </span>
                <span className="font-mono text-xl font-bold">
                  {(
                    (Number(config.monthlyAmount) * Number(config.totalMonths)) /
                    1e6
                  ).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  USDC
                </span>
              </div>
            </div>
          </>
        )}

        {/* Barcode (Fake) */}
        <div className="p-6 flex justify-center">
          <div className="flex gap-[2px] h-12">
            {Array.from({ length: 40 }).map((_, i) => (
              <div
                key={i}
                className="w-[3px] bg-black"
                style={{ height: `${Math.random() * 60 + 40}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Deploy Button - THE SMASH */}
      <button
        disabled={!isComplete}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => setIsPressed(false)}
        onClick={onDeploy}
        className={`
          w-full mt-6 py-6 font-black text-2xl uppercase tracking-tight
          border-[3px] border-black transition-all duration-75
          ${
            isComplete
              ? isPressed
                ? 'bg-white translate-x-[4px] translate-y-[4px] shadow-none cursor-pointer'
                : 'bg-[#FF00FF] shadow-[4px_4px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000] cursor-pointer'
              : 'bg-[#FAF9F6] text-gray-400 cursor-not-allowed shadow-none'
          }
        `}
      >
        {isComplete ? '/// CONFIRM DEPLOY ///' : '/// INCOMPLETE ///'}
      </button>

      {/* Status Message */}
      {!isComplete && (
        <div className="mt-4 bg-[#FFD600] border-[3px] border-black p-4">
          <p className="font-mono text-sm font-bold">
            [WAITING] Fill all parameters to proceed
          </p>
        </div>
      )}

      {/* Receipt Print Animation */}
      <style jsx>{`
        @keyframes receipt-print {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-receipt-print {
          animation: receipt-print 0.4s ease-out;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-receipt-print {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}
```

### Create Page Layout

**File:** `frontend/src/app/create/page.tsx`

```typescript
'use client'

import { useState } from 'react'
import { useTemplateRegistry } from '@/hooks/useTemplateRegistry'
import { useRentalChat } from '@/hooks/useRentalChat'
import { TemplateSelector } from '@/components/chat/TemplateSelector'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { ContractReceiptCard } from '@/components/contract/ContractReceiptCard'
import MarqueeTicker from '@/components/layout/MarqueeTicker'
import NavigationRail from '@/components/layout/NavigationRail'

export default function CreatePage() {
  const { templates } = useTemplateRegistry()
  const [detectedTemplate, setDetectedTemplate] = useState<string | null>(null)
  const [manualTemplate, setManualTemplate] = useState<string | null>(null)
  const [extractedConfig, setExtractedConfig] = useState<any>(null)

  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useRentalChat({
      onTemplateDetected: (templateId) => {
        setDetectedTemplate(templateId)
      },
      onConfigExtracted: (config) => {
        setExtractedConfig(config)
      },
    })

  const activeTemplate = manualTemplate || detectedTemplate
  const template = templates.find((t) => t.id === activeTemplate)

  return (
    <div className="min-h-screen h-screen overflow-hidden bg-[#FAF9F6] flex">
      {/* Zone A: Navigation Rail (Left - 88px) */}
      <NavigationRail />

      {/* Zone B: Command Center (Center - 45%) */}
      <div className="w-[45%] flex flex-col bg-white border-r-[3px] border-black">
        {/* Marquee Ticker */}
        <MarqueeTicker />

        {/* Template Selector (if no template selected) */}
        {!activeTemplate && (
          <div className="flex-1 overflow-y-auto p-6">
            <TemplateSelector
              templates={templates}
              onSelect={setManualTemplate}
            />
          </div>
        )}

        {/* Chat Interface (if template selected) */}
        {activeTemplate && (
          <ChatInterface
            messages={messages}
            input={input}
            handleInputChange={handleInputChange}
            handleSubmit={handleSubmit}
            isLoading={isLoading}
            detectedTemplate={template}
          />
        )}
      </div>

      {/* Zone C: Execution Deck (Right - Remaining) */}
      <div
        className="flex-1 overflow-y-auto p-8"
        style={{
          backgroundImage:
            'radial-gradient(circle, #000 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0',
          opacity: 0.95,
        }}
      >
        {activeTemplate && extractedConfig && template && (
          <ContractReceiptCard
            template={template}
            config={extractedConfig}
            onDeploy={() => {
              console.log('Deploy triggered')
              // Handle deployment
            }}
          />
        )}

        {!activeTemplate && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="font-black text-4xl uppercase mb-4 opacity-20">
                /// STANDBY ///
              </div>
              <p className="font-mono text-sm opacity-40">
                SELECT TEMPLATE TO BEGIN
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

---

## 6. AI CHAT INTEGRATION

### Template Detection API

**File:** `frontend/src/app/api/chat/route.ts`

```typescript
import { streamText } from 'ai'
import { google } from '@ai-sdk/google'

export async function POST(req: Request) {
  const { messages } = await req.json()
  const lastMessage = messages[messages.length - 1].content

  // Call backend to detect template
  const detectionRes = await fetch(
    `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/templates/detect`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: lastMessage }),
    }
  )

  const { template } = await detectionRes.json()

  const systemPrompt = template
    ? `You are assisting with creating a ${template.name}.
       Extract these parameters: ${Object.keys(template.parameterSchema.shape).join(', ')}

       Ask clarifying questions one at a time.
       Be conversational and friendly.
       Use the user's language style (formal/informal).`
    : `You are a contract creation assistant.
       Help the user choose the right template for their use case.

       Available templates:
       - Rent Vault: For recurring rent payments
       - Group Buy Escrow: For group purchases with voting
       - Stable Allowance Treasury: For allowance-based payments

       Ask what they want to create.`

  const result = await streamText({
    model: google('gemini-3-flash'),
    system: systemPrompt,
    messages,
  })

  return result.toDataStreamResponse()
}
```

### Parameter Extraction API

**File:** `frontend/src/app/api/extract-config/route.ts`

```typescript
import { generateObject } from 'ai'
import { google } from '@ai-sdk/google'

export async function POST(req: Request) {
  const { messages, templateId } = await req.json()

  // Fetch template from backend
  const templateRes = await fetch(
    `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/templates/${templateId}`
  )

  const { template } = await templateRes.json()

  if (!template) {
    return Response.json({ error: 'Unknown template' }, { status: 400 })
  }

  const { object } = await generateObject({
    model: google('gemini-3-flash'),
    schema: template.parameterSchema,
    prompt: `Extract contract parameters from this conversation: ${JSON.stringify(messages)}

    Only extract values that are explicitly mentioned.
    Leave fields undefined if not mentioned.`,
  })

  return Response.json({ config: object })
}
```

### Backend Template Detection Endpoint

**File:** `backend/src/routes/templates.ts`

```typescript
import { Router } from 'express'
import { templateRegistry } from '@/templates/registry'

const router = Router()

// POST /api/templates/detect
router.post('/detect', (req, res) => {
  const { message } = req.body

  if (!message) {
    return res.status(400).json({ error: 'Message required' })
  }

  const template = templateRegistry.detectFromIntent(message)

  res.json({
    template: template
      ? {
          id: template.id,
          name: template.name,
          parameterSchema: template.parameterSchema,
        }
      : null,
  })
})

// GET /api/templates/:id
router.get('/:id', (req, res) => {
  const template = templateRegistry.get(req.params.id)

  if (!template) {
    return res.status(404).json({ error: 'Template not found' })
  }

  res.json({
    template: {
      id: template.id,
      name: template.name,
      parameterSchema: template.parameterSchema,
    },
  })
})

export default router
```

---

## 7. DEPLOYMENT CHECKLIST

### Pre-Deployment

#### Database
- [ ] **Migration Applied**
  ```bash
  npx supabase db push
  ```
- [ ] **Verify Tables Created**
  ```bash
  npx supabase db diff
  ```
- [ ] **Test Queries**
  ```sql
  SELECT * FROM contracts LIMIT 1;
  SELECT * FROM contract_metadata LIMIT 1;
  ```

#### Environment Variables

**Backend** (`.env` in repo root):
```env
# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Blockchain
BASE_RPC_URL=https://sepolia.base.org
FACTORY_ADDRESS=0x...  # From contract deployment

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Optional - Keeper Service
KEEPER_PRIVATE_KEY=0x...
```

**Frontend** (`.env.local`):
```env
# AI
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSy...

# Wallet
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=xxx

# Backend Integration
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001

# RPC
NEXT_PUBLIC_BASE_RPC_URL=https://sepolia.base.org
NEXT_PUBLIC_MAINNET_RPC_URL=https://eth.llamarpc.com

# Contracts
NEXT_PUBLIC_FACTORY_ADDRESS=0x...
NEXT_PUBLIC_RENTAL_IMPLEMENTATION=0x...
```

#### Smart Contracts
- [ ] **Deploy Implementation Contracts**
  ```bash
  cd contracts
  forge script script/Deploy.s.sol --rpc-url base-sepolia --broadcast --verify
  ```
- [ ] **Deploy Factory**
  ```bash
  forge script script/DeployFactory.s.sol --rpc-url base-sepolia --broadcast --verify
  ```
- [ ] **Update Addresses in .env**

#### Templates
- [ ] **RentVault Definition Created**
- [ ] **GroupBuyEscrow Definition Created**
- [ ] **StableAllowanceTreasury Definition Created**
- [ ] **All Templates Registered in Registry**

#### ABIs
- [ ] **Copy ABIs from contracts/out**
  ```bash
  # Copy to backend
  cp contracts/out/RentVault.sol/RentVault.json backend/src/lib/contracts/abis/

  # Copy to frontend
  cp contracts/out/RentVault.sol/RentVault.json frontend/src/lib/contracts/abis/
  ```

### Deployment Order

**1. Deploy Smart Contracts**
```bash
cd contracts
forge script script/Deploy.s.sol --rpc-url base --broadcast --verify
```

**2. Update Environment Variables**
- Update `FACTORY_ADDRESS` in `.env`
- Update `NEXT_PUBLIC_FACTORY_ADDRESS` in frontend `.env.local`

**3. Start Backend**
```bash
cd backend
npm install
npm run build
npm start
```

**4. Start Frontend**
```bash
cd frontend
npm install
npm run build
npm start
```

**5. Verify Integration**
- [ ] Backend health check: `curl http://localhost:3001/health`
- [ ] Templates endpoint: `curl http://localhost:3001/api/templates`
- [ ] Frontend loads: `http://localhost:3000`
- [ ] Template selector shows all templates
- [ ] Chat detects template from keywords
- [ ] Parameter extraction works
- [ ] Receipt card renders correctly

---

## 8. ADDING NEW TEMPLATES (3 STEPS)

### Example: Adding "Payment Splitter" Template

**Step 1: Create Template Definition**

```bash
mkdir backend/src/templates/payment-splitter
```

Create files:
- `backend/src/templates/payment-splitter/definition.ts`
- `backend/src/templates/payment-splitter/abi.ts`
- `backend/src/templates/payment-splitter/schema.ts`

**definition.ts:**
```typescript
import { z } from 'zod'
import { PAYMENT_SPLITTER_ABI } from './abi'
import { publicClient } from '@/config/blockchain'
import type { TemplateDefinition } from '../base/TemplateDefinition'

export const PaymentSplitterTemplate: TemplateDefinition = {
  id: 'payment-splitter',
  name: 'Payment Splitter',
  description: 'Split incoming payments among multiple recipients',
  category: 'finance',

  abi: PAYMENT_SPLITTER_ABI,

  keywords: ['split', 'share', 'divide', 'distribute', 'payees'],
  intentPatterns: [
    /split.*payment/i,
    /distribute.*among/i,
    /share.*revenue/i,
  ],

  parameterSchema: z.object({
    payees: z.array(z.string().regex(/^0x[a-fA-F0-9]{40}$/)),
    shares: z.array(z.number().int().positive()),
  }),

  metadataSchema: z.object({
    payees: z.array(z.string()),
    shares: z.array(z.number()),
    totalReleased: z.string(),
  }),

  readContractState: async (address) => {
    // Implement blockchain reading logic
    return {
      payees: [],
      shares: [],
      totalReleased: '0',
    }
  },

  dashboardFields: [
    { key: 'payees', label: 'Recipients', type: 'text' },
    { key: 'shares', label: 'Shares', type: 'text' },
    { key: 'totalReleased', label: 'Total Released', type: 'amount' },
  ],

  actionButtons: [
    {
      id: 'release',
      label: 'Release Payment',
      description: 'Release available funds to payees',
      functionName: 'release',
    },
  ],

  roles: ['payee'],
  getUserRole: (userAddress, contractData) => {
    return contractData.payees?.includes(userAddress) ? ['payee'] : []
  },
}
```

**Step 2: Register in Registry**

```typescript
// backend/src/templates/registry.ts

import { PaymentSplitterTemplate } from './payment-splitter/definition'

constructor() {
  // ...existing templates
  this.register(RentVaultTemplate)
  this.register(GroupBuyEscrowTemplate)
  this.register(StableAllowanceTreasuryTemplate)
  this.register(PaymentSplitterTemplate)  // ✅ Add this line
}
```

**Step 3: Done!**

That's it! No other changes needed:
- ✅ Database automatically supports it (JSONB)
- ✅ API routes work generically
- ✅ Frontend auto-populates selector
- ✅ AI detects from keywords
- ✅ Receipt card renders dynamically

---

## 9. TESTING GUIDE

### Unit Tests

#### Backend Template Registry
```bash
cd backend
npm test src/templates/registry.test.ts
```

**Test Cases:**
- Template registration
- Get template by ID
- Detect template from intent
- Search templates

#### Generic Sync Service
```bash
npm test src/services/blockchain/genericSync.test.ts
```

**Test Cases:**
- Sync RentVault contract
- Sync GroupBuyEscrow contract
- Handle unknown template
- Validate metadata with schema

### Integration Tests

#### Template Detection
**Test:** User sends "I want to rent my apartment"
**Expected:** RentVault template detected

**Test:** User sends "split payment between 3 people"
**Expected:** PaymentSplitter template detected

#### Parameter Extraction
**Test:** User provides all required fields
**Expected:** Config completeness = 100%

**Test:** User provides partial info
**Expected:** Config completeness < 100%

#### Backend Sync
**Test:** Deploy contract → Emit event
**Expected:** Backend catches event, syncs to Supabase

**Test:** Manual sync via API
**Expected:** Latest blockchain state in database

### Manual Testing Checklist

- [ ] **Template Selector**
  - [ ] Shows all 3 templates
  - [ ] Cards have correct icons
  - [ ] Click selects template
  - [ ] "Smash" animation works

- [ ] **AI Chat**
  - [ ] Detects RentVault from "rent"
  - [ ] Detects GroupBuyEscrow from "group buy"
  - [ ] Detects StableAllowanceTreasury from "allowance"
  - [ ] Asks clarifying questions
  - [ ] Extracts parameters correctly

- [ ] **Receipt Card**
  - [ ] Shows all dashboard fields
  - [ ] Progress bar updates
  - [ ] Barcode renders
  - [ ] Deploy button enables at 100%
  - [ ] "Smash" animation on click

- [ ] **Dashboard**
  - [ ] Lists all user contracts
  - [ ] Filters by template type
  - [ ] Shows correct metadata
  - [ ] Opens detail view

- [ ] **Contract Detail**
  - [ ] Shows template name
  - [ ] Displays all fields
  - [ ] Action buttons appear
  - [ ] Buttons enable based on state

---

## 🎉 SUMMARY

### What You Built

✅ **Scalable Multi-Template Platform**
- Add new templates in 3 steps (no migrations!)
- AI auto-detects template from user intent
- Generic backend handles all template types
- Dynamic frontend adapts to any template

✅ **Neo-Brutalist "Loud Finance" UI**
- Hard shadows (`shadow-[4px_4px_0px_#000]`)
- Sharp borders (`border-[3px] border-black`)
- Loud colors (Acid Lime, Hot Pink, Warning Yellow)
- Jagged receipt card with barcode
- Tactile button interactions ("The Smash")
- 3-zone hybrid layout (88px + 45% + flex)

✅ **Production-Ready Architecture**
- Next.js API routes for AI (streaming chat)
- Express backend for data (blockchain sync, cron jobs)
- Supabase JSONB for flexible storage
- Template registry as single source of truth
- Type-safe with Zod schemas

### Key Benefits

| Feature | Benefit |
|---------|---------|
| **No Migrations** | Drop in new template definition = instant support |
| **AI-Powered** | Auto-detects intent, extracts parameters |
| **Type-Safe** | Zod validates all data at runtime |
| **Fast Queries** | GIN index on JSONB metadata |
| **Scalable** | Supports unlimited template types |
| **Generic APIs** | One set of routes handles all templates |
| **Dynamic UI** | Frontend adapts to any template |

### File Structure Summary

```
civitas/
├── supabase/migrations/
│   └── 20260203_multi_template_support.sql  ← Database migration
├── backend/src/
│   ├── templates/
│   │   ├── base/TemplateDefinition.ts       ← Interface
│   │   ├── registry.ts                      ← Central registry
│   │   ├── rent-vault/definition.ts         ← RentVault template
│   │   ├── group-buy-escrow/definition.ts   ← GroupBuyEscrow template
│   │   └── stable-allowance-treasury/definition.ts
│   ├── services/blockchain/genericSync.ts   ← Generic sync
│   └── routes/contracts.ts                  ← Generic API
└── frontend/src/
    ├── hooks/useTemplateRegistry.ts         ← Fetch templates
    ├── components/
    │   ├── chat/TemplateSelector.tsx        ← Neo-brutalist cards
    │   └── contract/ContractReceiptCard.tsx ← Jagged receipt
    └── app/
        ├── create/page.tsx                  ← 3-zone layout
        └── api/
            ├── chat/route.ts                ← AI detection
            └── extract-config/route.ts      ← Parameter extraction
```

---

**Ready to integrate? Start with Section 2 (Database Migration) and work through each section sequentially.**

**Questions? Check the troubleshooting section or review the example implementations.**

**🚀 Happy Building!**
