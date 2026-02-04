# ENS Integration Plan for Civitas

**Date:** 2026-02-04
**Project:** Civitas - AI-Powered Cross-Chain Agreement Platform
**Target:** Enhanced ENS Integration for Public Contract Discovery

---

## Executive Summary

This plan outlines the integration of ENS (Ethereum Name Service) into Civitas to enable:

1. **Domain-to-Address Resolution**: Resolve human-readable names to contract addresses
2. **Public Contract Registry**: Store contract metadata in ENS text records for discoverability
3. **Legal Reference System**: Enable external parties to verify contract terms via ENS

**Key Value Proposition**: Any party can verify contract details by querying ENS records, creating a publicly auditable legal framework accessible from any ENS-compatible client.

---

## 1. Current State Analysis

### 1.1 Existing Infrastructure

**Contract Templates (3)**:
- `RentVault.sol` - Multi-tenant rent collection (single payment)
- `GroupBuyEscrow.sol` - Group purchase with majority voting
- `StableAllowanceTreasury.sol` - Periodic allowance releases

**Deployment Pattern**:
- Factory: `CivitasFactory.sol` using CREATE2 + EIP-1167 minimal proxies
- Deterministic addresses via `keccak256(creator, suggestedName)`
- Base L2 deployment (Chain ID: 8453)

**Current ENS Usage**:
- Basenames for human-readable contract addresses (e.g., `downtown-studio-6mo.civitas.base.eth`)
- ENS resolution for tenant addresses (mainnet lookup)
- Limited to address mapping only

### 1.2 Gap Analysis

**Missing Capabilities**:
1. ❌ Contract metadata not stored in ENS records
2. ❌ No reverse resolution (address → name lookup)
3. ❌ Contract terms not publicly queryable via ENS
4. ❌ No standardized schema for contract data
5. ❌ Legal parties cannot verify contracts externally
6. ❌ No cross-chain ENS integration strategy

---

## 2. Integration Architecture

### 2.1 Three-Layer ENS Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    LAYER 1: NAME RESOLUTION                  │
│  Domain ←→ Address Translation (Already Implemented)        │
├─────────────────────────────────────────────────────────────┤
│  • Forward: basename → contract address                     │
│  • Reverse: contract address → basename                     │
│  • L1 Mainnet: Universal Resolver                           │
│  • L2 Base: Basename Resolver                               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              LAYER 2: CONTRACT METADATA STORAGE              │
│  ENS Text Records as Public Contract Registry               │
├─────────────────────────────────────────────────────────────┤
│  Text Records (Standardized Keys):                          │
│  • contract.type        → "RentVault" | "GroupBuyEscrow"   │
│  • contract.version     → "1.0.0"                           │
│  • contract.status      → "Active" | "Completed"            │
│  • contract.participants → JSON array of addresses          │
│  • contract.terms       → IPFS hash to full terms           │
│  • contract.created     → ISO timestamp                     │
│  • contract.metadata    → JSON of contract-specific data    │
│  • legal.jurisdiction   → "US-CA" | "UK" | etc.            │
│  • legal.type           → "rental" | "escrow" | "treasury"  │
│  • avatar               → Contract logo/icon (IPFS)         │
│  • url                  → Link to Civitas dashboard         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│            LAYER 3: EXTERNAL DISCOVERABILITY                 │
│  Public APIs & Third-Party Integration                      │
├─────────────────────────────────────────────────────────────┤
│  • ENS Subgraph: Query all Civitas contracts                │
│  • Direct ENS Resolution: Any client can verify terms       │
│  • Legal Verification Tool: External parties check records  │
│  • Contract Explorer: Public search interface               │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 ENS Record Schema

#### Standard Text Record Keys

| Key | Value | Example |
|-----|-------|---------|
| `contract.type` | Template name | `"RentVault"` |
| `contract.version` | Semver version | `"1.0.0"` |
| `contract.status` | Current state | `"Active"` |
| `contract.chain` | Deployment chain | `"base-8453"` |
| `contract.factory` | Factory address | `"0x..."` |
| `contract.implementation` | Implementation address | `"0x..."` |
| `contract.creator` | Creator address | `"0x..."` |
| `contract.created` | ISO 8601 timestamp | `"2026-02-04T12:00:00Z"` |
| `contract.participants` | JSON array | `'["landlord:0x...","tenant:0x..."]'` |
| `contract.terms` | IPFS hash | `"ipfs://Qm..."` |
| `legal.jurisdiction` | ISO 3166-2 code | `"US-CA"` |
| `legal.type` | Agreement type | `"residential_lease"` |
| `legal.hash` | Terms hash (SHA-256) | `"0x..."` |
| `url` | Dashboard link | `"https://civitas.app/contract/0x..."` |
| `avatar` | Contract icon | `"ipfs://Qm..."` or emoji |

#### Template-Specific Records

**RentVault**:
```json
{
  "contract.rent.amount": "1000000000",  // 1000 USDC (6 decimals)
  "contract.rent.dueDate": "1738656000",
  "contract.rent.tenantCount": "3",
  "contract.rent.currency": "USDC",
  "contract.rent.currencyAddress": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
}
```

**GroupBuyEscrow**:
```json
{
  "contract.escrow.goal": "50000000000",  // 50000 USDC
  "contract.escrow.expiry": "1740000000",
  "contract.escrow.participantCount": "10",
  "contract.escrow.deliveryRequired": "true",
  "contract.escrow.votingThreshold": "51"  // 51%
}
```

**StableAllowanceTreasury**:
```json
{
  "contract.treasury.allowancePerIncrement": "500000000",  // 500 USDC
  "contract.treasury.approvalCount": "12",
  "contract.treasury.claimedCount": "8",
  "contract.treasury.owner": "0x...",
  "contract.treasury.recipient": "0x..."
}
```

---

## 3. Implementation Plan

### Phase 1: Smart Contract ENS Integration (Week 1)

#### 3.1 Add ENS Resolver Interface

**File**: `contracts/src/interfaces/IENSResolver.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IENSTextResolver {
    function setText(bytes32 node, string calldata key, string calldata value) external;
    function text(bytes32 node, string calldata key) external view returns (string memory);
}

interface IENSReverseRegistrar {
    function setName(string memory name) external returns (bytes32);
    function node(address addr) external pure returns (bytes32);
}
```

#### 3.2 Extend CivitasFactory

**File**: `contracts/src/CivitasFactory.sol`

Add ENS text record writing capability:

```solidity
// Add to state variables
IENSTextResolver public ensResolver;
IENSReverseRegistrar public reverseRegistrar;
bytes32 public civitasParentNode;  // namehash("civitas.base.eth")

// Add function to set ENS records after deployment
function setContractENSRecords(
    address contractAddress,
    string calldata basename,
    string[] calldata keys,
    string[] calldata values
) external {
    require(msg.sender == getContractCreator(contractAddress), "Not creator");
    bytes32 node = keccak256(abi.encodePacked(civitasParentNode, keccak256(bytes(basename))));

    for (uint256 i = 0; i < keys.length; i++) {
        ensResolver.setText(node, keys[i], values[i]);
    }

    // Set reverse record
    // (Contract needs to call reverseRegistrar.setName() from its own address)
}
```

#### 3.3 Template Metadata Helpers

Add to each template contract:

```solidity
// In RentVault.sol
function getENSMetadata() external view returns (
    string memory contractType,
    string memory status,
    string[] memory keys,
    string[] memory values
) {
    contractType = "RentVault";
    status = withdrawn ? "Completed" : (totalDeposited == rentAmount ? "Funded" : "Pending");

    // Build metadata arrays
    keys = new string[](8);
    values = new string[](8);

    keys[0] = "contract.type";
    values[0] = "RentVault";

    keys[1] = "contract.status";
    values[1] = status;

    keys[2] = "contract.rent.amount";
    values[2] = _uint2str(rentAmount);

    // ... additional fields
}
```

#### 3.4 Testing

**File**: `contracts/test/ENSIntegration.t.sol`

```solidity
// Test ENS record setting
function testSetENSRecords() public {
    // Deploy contract
    address clone = factory.createRentVault(...);

    // Set ENS records
    string[] memory keys = new string[](3);
    string[] memory values = new string[](3);
    keys[0] = "contract.type";
    values[0] = "RentVault";

    factory.setContractENSRecords(clone, "test-rent", keys, values);

    // Verify records
    bytes32 node = namehash("test-rent.civitas.base.eth");
    assertEq(resolver.text(node, "contract.type"), "RentVault");
}
```

---

### Phase 2: Backend ENS Record Management (Week 2)

#### 2.1 ENS Writer Service

**File**: `backend/src/services/ens-writer.ts`

```typescript
import { createPublicClient, createWalletClient, http, namehash } from 'viem';
import { base, mainnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

export class ENSWriter {
  private mainnetClient;
  private baseClient;
  private walletClient;

  constructor(privateKey: string) {
    this.mainnetClient = createPublicClient({
      chain: mainnet,
      transport: http(process.env.MAINNET_RPC_URL),
    });

    this.baseClient = createPublicClient({
      chain: base,
      transport: http(process.env.BASE_RPC_URL),
    });

    const account = privateKeyToAccount(privateKey as `0x${string}`);
    this.walletClient = createWalletClient({
      account,
      chain: base,
      transport: http(process.env.BASE_RPC_URL),
    });
  }

  async setContractMetadata(
    basename: string,
    contractAddress: string,
    metadata: ContractMetadata
  ) {
    const node = namehash(`${basename}.civitas.base.eth`);
    const resolverAddress = await this.getResolver(node);

    const records = this.buildTextRecords(metadata);

    // Batch set text records
    for (const [key, value] of Object.entries(records)) {
      await this.setText(resolverAddress, node, key, value);
    }
  }

  private buildTextRecords(metadata: ContractMetadata): Record<string, string> {
    return {
      'contract.type': metadata.type,
      'contract.status': metadata.status,
      'contract.created': metadata.createdAt.toISOString(),
      'contract.participants': JSON.stringify(metadata.participants),
      'contract.terms': metadata.termsIpfsHash,
      'legal.jurisdiction': metadata.jurisdiction,
      'legal.type': metadata.legalType,
      'url': `https://civitas.app/contract/${metadata.address}`,
      // Template-specific fields
      ...metadata.customFields,
    };
  }

  private async setText(
    resolverAddress: string,
    node: string,
    key: string,
    value: string
  ) {
    const { request } = await this.baseClient.simulateContract({
      address: resolverAddress as `0x${string}`,
      abi: ENS_RESOLVER_ABI,
      functionName: 'setText',
      args: [node as `0x${string}`, key, value],
      account: this.walletClient.account,
    });

    return this.walletClient.writeContract(request);
  }
}
```

#### 2.2 Contract Event Listener

**File**: `backend/src/services/contract-listener.ts`

```typescript
export class ContractEventListener {
  async handleContractCreated(event: ContractCreatedEvent) {
    const { contractAddress, creator, templateType } = event;

    // Generate basename via AI (existing logic)
    const basename = await this.generateBasename(event);

    // Fetch contract state
    const contractState = await this.readContractState(contractAddress, templateType);

    // Upload full terms to IPFS
    const termsIpfsHash = await this.uploadTermsToIPFS({
      contractAddress,
      templateType,
      state: contractState,
      participants: this.extractParticipants(contractState),
    });

    // Build metadata
    const metadata: ContractMetadata = {
      type: templateType,
      status: 'Deployed',
      address: contractAddress,
      creator,
      createdAt: new Date(),
      participants: this.extractParticipants(contractState),
      termsIpfsHash,
      jurisdiction: 'US-CA', // From user input or default
      legalType: this.mapToLegalType(templateType),
      customFields: this.buildTemplateFields(templateType, contractState),
    };

    // Write to ENS
    await this.ensWriter.setContractMetadata(basename, contractAddress, metadata);

    // Store in Supabase
    await this.supabase.from('contracts').insert({
      address: contractAddress,
      basename: `${basename}.civitas.base.eth`,
      ens_metadata: metadata,
    });
  }

  private buildTemplateFields(type: string, state: any): Record<string, string> {
    switch (type) {
      case 'RentVault':
        return {
          'contract.rent.amount': state.rentAmount.toString(),
          'contract.rent.dueDate': state.dueDate.toString(),
          'contract.rent.tenantCount': state.tenantCount.toString(),
          'contract.rent.currency': 'USDC',
        };
      case 'GroupBuyEscrow':
        return {
          'contract.escrow.goal': state.fundingGoal.toString(),
          'contract.escrow.expiry': state.expiryDate.toString(),
          'contract.escrow.participantCount': state.participantCount.toString(),
        };
      case 'StableAllowanceTreasury':
        return {
          'contract.treasury.allowancePerIncrement': state.allowancePerIncrement.toString(),
          'contract.treasury.owner': state.owner,
          'contract.treasury.recipient': state.recipient,
        };
      default:
        return {};
    }
  }
}
```

#### 2.3 IPFS Terms Storage

**File**: `backend/src/services/ipfs-uploader.ts`

```typescript
import { create } from 'ipfs-http-client';

export class IPFSUploader {
  private client;

  constructor() {
    // Use Pinata, Infura, or local IPFS node
    this.client = create({
      url: process.env.IPFS_API_URL || 'https://ipfs.infura.io:5001',
      headers: {
        authorization: `Bearer ${process.env.IPFS_AUTH_TOKEN}`,
      },
    });
  }

  async uploadContractTerms(terms: ContractTerms): Promise<string> {
    const content = JSON.stringify({
      version: '1.0',
      contractAddress: terms.contractAddress,
      templateType: terms.templateType,
      participants: terms.participants,
      state: terms.state,
      legalText: this.generateLegalText(terms),
      metadata: {
        uploadedAt: new Date().toISOString(),
        platform: 'Civitas',
        network: 'base',
      },
    }, null, 2);

    const result = await this.client.add(content);
    return `ipfs://${result.cid.toString()}`;
  }

  private generateLegalText(terms: ContractTerms): string {
    // Generate human-readable legal text from contract state
    // Use AI to convert structured data to prose
    switch (terms.templateType) {
      case 'RentVault':
        return this.generateRentalAgreement(terms.state);
      case 'GroupBuyEscrow':
        return this.generateEscrowAgreement(terms.state);
      case 'StableAllowanceTreasury':
        return this.generateTreasuryAgreement(terms.state);
      default:
        return 'Unknown contract type';
    }
  }
}
```

---

### Phase 3: Frontend ENS Reader (Week 3)

#### 3.1 ENS Resolver Hook

**File**: `frontend/hooks/useContractENSData.ts`

```typescript
import { usePublicClient } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { namehash } from 'viem/ens';

const TEXT_RECORD_KEYS = [
  'contract.type',
  'contract.status',
  'contract.created',
  'contract.participants',
  'contract.terms',
  'legal.jurisdiction',
  'legal.type',
  'url',
] as const;

export function useContractENSData(basename: string) {
  const publicClient = usePublicClient({ chainId: mainnet.id });

  const { data, isLoading, error } = useQuery({
    queryKey: ['ens-metadata', basename],
    queryFn: async () => {
      if (!publicClient) throw new Error('No client');

      const fullName = `${basename}.civitas.base.eth`;
      const node = namehash(fullName);

      // Get resolver
      const resolver = await publicClient.getEnsResolver({ name: fullName });
      if (!resolver) throw new Error('No resolver found');

      // Fetch all text records in parallel
      const records = await Promise.all(
        TEXT_RECORD_KEYS.map(async (key) => {
          const value = await publicClient.getEnsText({
            name: fullName,
            key,
          });
          return [key, value];
        })
      );

      return Object.fromEntries(records);
    },
    enabled: !!basename && !!publicClient,
  });

  return {
    metadata: data,
    isLoading,
    error,
    parsedParticipants: data?.['contract.participants']
      ? JSON.parse(data['contract.participants'])
      : null,
    termsIpfsUrl: data?.['contract.terms']
      ? data['contract.terms'].replace('ipfs://', 'https://ipfs.io/ipfs/')
      : null,
  };
}
```

#### 3.2 Public Contract Explorer

**File**: `frontend/app/explore/page.tsx`

```typescript
'use client';

import { useContractENSData } from '@/hooks/useContractENSData';
import { useState } from 'react';

export default function ExplorePage() {
  const [basename, setBasename] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const { metadata, isLoading, termsIpfsUrl } = useContractENSData(searchTerm);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Public Contract Explorer</h1>

      <div className="flex gap-4 mb-8">
        <input
          type="text"
          placeholder="Enter contract basename (e.g., downtown-studio-6mo)"
          className="flex-1 px-4 py-2 border rounded-lg"
          value={basename}
          onChange={(e) => setBasename(e.target.value)}
        />
        <button
          onClick={() => setSearchTerm(basename)}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg"
        >
          Search
        </button>
      </div>

      {isLoading && <p>Loading contract data from ENS...</p>}

      {metadata && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4">
            {basename}.civitas.base.eth
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="Type" value={metadata['contract.type']} />
            <InfoRow label="Status" value={metadata['contract.status']} />
            <InfoRow label="Created" value={metadata['contract.created']} />
            <InfoRow label="Jurisdiction" value={metadata['legal.jurisdiction']} />
            <InfoRow label="Legal Type" value={metadata['legal.type']} />
          </div>

          {termsIpfsUrl && (
            <div className="mt-6">
              <h3 className="font-bold mb-2">Full Contract Terms</h3>
              <a
                href={termsIpfsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                View on IPFS →
              </a>
            </div>
          )}

          <div className="mt-6">
            <h3 className="font-bold mb-2">Participants</h3>
            <ParticipantsList participants={metadata['contract.participants']} />
          </div>
        </div>
      )}
    </div>
  );
}
```

#### 3.3 ENS Metadata Display Component

**File**: `frontend/components/contract/ENSMetadataCard.tsx`

```typescript
export function ENSMetadataCard({ basename }: { basename: string }) {
  const { metadata, termsIpfsUrl } = useContractENSData(basename);

  if (!metadata) return null;

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Globe className="w-5 h-5 text-purple-600" />
        <h3 className="font-semibold text-gray-900">Public ENS Record</h3>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        This contract's details are publicly verifiable via ENS
      </p>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">ENS Name:</span>
          <span className="font-mono text-xs">{basename}.civitas.base.eth</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Status:</span>
          <Badge variant={getStatusVariant(metadata['contract.status'])}>
            {metadata['contract.status']}
          </Badge>
        </div>

        {termsIpfsUrl && (
          <a
            href={termsIpfsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-600 hover:underline mt-3"
          >
            <FileText className="w-4 h-4" />
            View Full Terms on IPFS
          </a>
        )}
      </div>
    </div>
  );
}
```

---

### Phase 4: Cross-Chain ENS Strategy (Week 4)

#### 4.1 L1 ↔ L2 Resolution

**Challenge**: ENS resolution starts on Ethereum Mainnet, but contracts are on Base L2.

**Solution**: Use CCIP-Read (ERC-3668) with a gateway.

```
┌─────────────────────────────────────────────────────────────┐
│                    ETHEREUM MAINNET (L1)                     │
│  ENS Registry + Universal Resolver                          │
├─────────────────────────────────────────────────────────────┤
│  Query: "downtown-studio.civitas.base.eth"                  │
│  └─> Resolver: CivitasL2Resolver.sol (L1)                  │
│      └─> OffchainLookup(gateway, calldata)                 │
└─────────────────────────────────────────────────────────────┘
                          ↓ CCIP-Read
┌─────────────────────────────────────────────────────────────┐
│                    GATEWAY (API Server)                      │
│  https://gateway.civitas.app/lookup                         │
├─────────────────────────────────────────────────────────────┤
│  • Receives calldata from L1 resolver                       │
│  • Queries Base L2 contract state                           │
│  • Returns signed response                                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                        BASE L2                               │
│  Actual contract deployment + state                         │
├─────────────────────────────────────────────────────────────┤
│  CivitasFactory + Contract Instances                        │
└─────────────────────────────────────────────────────────────┘
```

#### 4.2 L1 Resolver Contract

**File**: `contracts/src/l1/CivitasL2Resolver.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@ensdomains/ens-contracts/contracts/resolvers/profiles/IExtendedResolver.sol";

contract CivitasL2Resolver is IExtendedResolver {
    string[] public urls;  // Gateway URLs

    constructor(string[] memory _urls) {
        urls = _urls;
    }

    function resolve(bytes calldata name, bytes calldata data)
        external
        view
        override
        returns (bytes memory)
    {
        // Trigger CCIP-Read
        revert OffchainLookup(
            address(this),
            urls,
            data,
            CivitasL2Resolver.resolveWithProof.selector,
            abi.encode(name, data)
        );
    }

    function resolveWithProof(
        bytes calldata response,
        bytes calldata extraData
    ) external view returns (bytes memory) {
        // Verify signed response from gateway
        // Return resolved data
    }
}
```

#### 4.3 Gateway Implementation

**File**: `backend/src/gateway/ccip-read-handler.ts`

```typescript
import { Hono } from 'hono';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const app = new Hono();

app.get('/lookup/:sender/:calldata', async (c) => {
  const { sender, calldata } = c.req.param();

  // Decode calldata to extract function selector + args
  const { functionName, args } = decodeCCIPCalldata(calldata);

  // Query Base L2 for actual data
  const baseClient = createPublicClient({
    chain: base,
    transport: http(),
  });

  let result;
  if (functionName === 'text') {
    const [node, key] = args;
    result = await queryTextRecord(baseClient, node, key);
  } else if (functionName === 'addr') {
    const [node] = args;
    result = await queryAddressRecord(baseClient, node);
  }

  // Sign the response
  const signature = await signResponse(result);

  return c.json({
    data: result,
    signature,
  });
});

async function queryTextRecord(client, node, key) {
  // Map ENS node to Base contract address
  const contractAddress = await mapNodeToContract(node);

  // Query contract state or Supabase cache
  const metadata = await fetchContractMetadata(contractAddress);

  // Return the specific text record
  return metadata[key] || '';
}
```

---

## 4. Technical Implementation Details

### 4.1 ENS Name Structure

```
civitas.base.eth (Parent - owned by team)
    │
    ├── contract-123.civitas.base.eth (RentVault)
    │   ├── Forward: → 0xAbC...123 (Base L2 contract)
    │   ├── Reverse: 0xAbC...123 → contract-123.civitas.base.eth
    │   └── Text Records:
    │       ├── contract.type: "RentVault"
    │       ├── contract.status: "Active"
    │       ├── contract.participants: '["0x...","0x..."]'
    │       └── contract.terms: "ipfs://Qm..."
    │
    ├── escrow-abc.civitas.base.eth (GroupBuyEscrow)
    │   └── ...
    │
    └── treasury-xyz.civitas.base.eth (StableAllowanceTreasury)
        └── ...
```

### 4.2 Address Calculation Flow

```
1. User creates contract via AI chat
2. AI generates semantic name: "downtown-studio-6mo"
3. Factory predicts address: CREATE2(factory, salt, initCodeHash)
   └─> salt = keccak256(creator, suggestedName)
4. Basename registered: downtown-studio-6mo.civitas.base.eth
5. ENS forward record set: basename → predicted address
6. Contract deployed to predicted address (Tx #1)
7. ENS reverse record set: contract calls reverseRegistrar.setName()
8. ENS text records set: backend writes metadata (Tx #2/3)
9. IPFS terms uploaded: full legal text stored immutably
10. Supabase indexed: for fast queries
```

### 4.3 Multi-Chain Considerations

**Current**: Base L2 only
**Future**: Support multiple L2s

Strategy:
- Each L2 has its own subdomain: `base.civitas.eth`, `optimism.civitas.eth`
- Chain-specific text record: `contract.chain: "base-8453"`
- Use ENSIP-11 coinType for multi-chain addresses
- Gateway handles cross-L2 queries

---

## 5. Public Search & Discovery

### 5.1 ENS Subgraph Integration

**Query Contracts by Type**:
```graphql
query FindRentalContracts {
  domains(
    where: {
      name_contains: ".civitas.base.eth"
      resolver_: { texts_: { key: "contract.type", value: "RentVault" } }
    }
  ) {
    name
    resolver {
      texts {
        key
        value
      }
    }
  }
}
```

### 5.2 Legal Verification Tool

**File**: `frontend/app/verify/page.tsx`

```typescript
// Public page - no wallet required
export default function VerifyContractPage() {
  const [ensName, setEnsName] = useState('');

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto max-w-2xl">
        <h1 className="text-4xl font-bold mb-4">
          Verify Civitas Contract
        </h1>
        <p className="text-gray-600 mb-8">
          Enter a Civitas ENS name to view publicly verifiable contract details.
          No wallet or account required.
        </p>

        <input
          type="text"
          placeholder="contract-name.civitas.base.eth"
          className="w-full px-4 py-3 border rounded-lg mb-4"
          value={ensName}
          onChange={(e) => setEnsName(e.target.value)}
        />

        <ContractVerificationResults ensName={ensName} />
      </div>
    </div>
  );
}
```

### 5.3 External API for Third Parties

**File**: `backend/src/api/public/contracts.ts`

```typescript
// Public REST API - no auth required
app.get('/api/v1/contracts/:basename', async (c) => {
  const { basename } = c.req.param();

  // Resolve via ENS
  const metadata = await resolveENSMetadata(`${basename}.civitas.base.eth`);

  // Return standardized JSON
  return c.json({
    name: `${basename}.civitas.base.eth`,
    contractAddress: metadata.address,
    type: metadata['contract.type'],
    status: metadata['contract.status'],
    participants: JSON.parse(metadata['contract.participants']),
    termsIpfs: metadata['contract.terms'],
    legalJurisdiction: metadata['legal.jurisdiction'],
    createdAt: metadata['contract.created'],
    dashboardUrl: metadata.url,
  });
});

// List all contracts
app.get('/api/v1/contracts', async (c) => {
  const { type, status, page = 1, limit = 20 } = c.req.query();

  // Query ENS subgraph or Supabase cache
  const contracts = await queryContracts({ type, status, page, limit });

  return c.json({
    contracts,
    pagination: { page, limit, total: contracts.length },
  });
});
```

---

## 6. Security & Trust Model

### 6.1 Data Integrity

**Problem**: How do users trust ENS records haven't been tampered with?

**Solutions**:

1. **Immutable IPFS Terms**:
   - Full legal text stored on IPFS (content-addressed)
   - ENS only stores IPFS hash
   - Hash mismatch = tampering detected

2. **On-Chain Hash Verification**:
   ```solidity
   // In contract
   bytes32 public termsHash;

   function verifyTerms(string calldata ipfsContent) public view returns (bool) {
       return keccak256(bytes(ipfsContent)) == termsHash;
   }
   ```

3. **ENS Record Ownership**:
   - Only contract creator can update records
   - Verified via `setContractENSRecords()` modifier
   - Transparent on-chain ownership trail

### 6.2 Privacy Considerations

**Public Data** (in ENS):
- Contract type, status, creation date
- Participant addresses (already public on-chain)
- Legal jurisdiction, terms hash
- IPFS link to full terms

**Private Data** (NOT in ENS):
- Personal information (names, IDs)
- Payment details beyond amounts
- Internal communications
- Dispute details

### 6.3 Record Update Policy

**Who Can Update**:
- Contract creator: Initial records
- Contract itself: Status updates (via automated calls)
- Admin (emergency): Corrections only, logged

**Update Events**:
```solidity
event ENSRecordUpdated(
    bytes32 indexed node,
    string key,
    string oldValue,
    string newValue,
    address updater
);
```

---

## 7. Cost Analysis

### 7.1 Gas Costs (Base L2)

| Operation | Estimated Gas | Cost @ 0.001 gwei |
|-----------|---------------|-------------------|
| Register basename | 100,000 | $0.02 |
| Set forward record | 50,000 | $0.01 |
| Set reverse record | 50,000 | $0.01 |
| Set 8 text records | 400,000 | $0.08 |
| **Total per contract** | **~600,000** | **~$0.12** |

### 7.2 Storage Costs

| Service | Cost | Notes |
|---------|------|-------|
| IPFS (Pinata) | $0.15/GB/month | ~5KB per contract = negligible |
| ENS text records | Gas only | No recurring fees |
| Supabase | Free tier | 500MB sufficient for 100k contracts |

### 7.3 Optimization Strategies

1. **Batch Text Record Updates**:
   ```solidity
   function setTextMulti(bytes32 node, string[] keys, string[] values) external;
   ```

2. **Lazy ENS Writing**:
   - Only write essential records on creation
   - Update status fields on contract events (triggered by users)

3. **Off-Chain Gateway**:
   - Serve frequently accessed data from cache
   - Only L1 queries hit mainnet (expensive)

---

## 8. Testing Strategy

### 8.1 Smart Contract Tests

**File**: `contracts/test/ENSIntegration.t.sol`

```solidity
contract ENSIntegrationTest is Test {
    function testFullENSFlow() public {
        // 1. Deploy contract
        address clone = factory.createRentVault(...);

        // 2. Set ENS records
        factory.setContractENSRecords(clone, "test-rent", keys, values);

        // 3. Verify forward resolution
        bytes32 node = namehash("test-rent.civitas.base.eth");
        address resolved = resolver.addr(node);
        assertEq(resolved, clone);

        // 4. Verify text records
        assertEq(resolver.text(node, "contract.type"), "RentVault");

        // 5. Verify reverse resolution
        string memory name = reverseRegistrar.name(clone);
        assertEq(name, "test-rent.civitas.base.eth");
    }

    function testENSRecordUpdatePermissions() public {
        // Only creator can update
        vm.prank(attacker);
        vm.expectRevert("Not creator");
        factory.setContractENSRecords(clone, "test-rent", keys, values);
    }
}
```

### 8.2 Integration Tests

**File**: `backend/__tests__/ens-writer.test.ts`

```typescript
describe('ENS Writer Service', () => {
  it('should set all contract metadata', async () => {
    const metadata = buildTestMetadata();
    await ensWriter.setContractMetadata('test-contract', '0x123', metadata);

    // Verify via ENS resolution
    const resolved = await resolveENSMetadata('test-contract.civitas.base.eth');
    expect(resolved['contract.type']).toBe('RentVault');
  });

  it('should upload terms to IPFS and link in ENS', async () => {
    const ipfsHash = await ipfsUploader.uploadContractTerms(terms);
    expect(ipfsHash).toMatch(/^ipfs:\/\/Qm/);

    // Verify ENS record points to IPFS
    const ensIpfs = await getTextRecord(node, 'contract.terms');
    expect(ensIpfs).toBe(ipfsHash);
  });
});
```

### 8.3 End-to-End Tests

**File**: `e2e/ens-integration.spec.ts`

```typescript
test('public user can verify contract via ENS', async ({ page }) => {
  // Navigate to public verification page
  await page.goto('https://civitas.app/verify');

  // Enter ENS name
  await page.fill('input[placeholder*="civitas.base.eth"]', 'test-contract');
  await page.click('button:has-text("Verify")');

  // Assert contract details appear
  await expect(page.locator('text=RentVault')).toBeVisible();
  await expect(page.locator('text=Active')).toBeVisible();

  // Click IPFS link
  const ipfsLink = page.locator('a:has-text("View Full Terms")');
  await expect(ipfsLink).toHaveAttribute('href', /^https:\/\/ipfs\.io/);
});
```

---

## 9. Documentation & User Education

### 9.1 Public Documentation

**Create**: `docs/ens/README.md`

```markdown
# How Civitas Uses ENS

Civitas leverages ENS to make smart contracts legally verifiable outside our platform.

## For Contract Participants

Every Civitas contract has:
- **Human-readable name**: `your-contract.civitas.base.eth`
- **Public verification page**: https://civitas.app/verify/your-contract
- **Immutable terms**: Stored on IPFS, linked via ENS

## For External Verifiers (Lawyers, Auditors)

You can verify any Civitas contract without an account:

1. Visit https://civitas.app/verify
2. Enter the contract ENS name
3. Review publicly available:
   - Contract type and status
   - Participant addresses
   - Full legal terms (IPFS)
   - Creation date and jurisdiction

## For Developers

Query Civitas contracts via ENS:

```javascript
const metadata = await publicClient.getEnsText({
  name: 'contract-name.civitas.base.eth',
  key: 'contract.type',
});
```

See [API Docs](/docs/api) for full reference.
```

### 9.2 In-App Tooltips

**File**: `frontend/components/tooltips/ENSExplainer.tsx`

```typescript
export function ENSExplainer() {
  return (
    <Tooltip>
      <TooltipTrigger>
        <InfoIcon className="w-4 h-4 text-gray-400" />
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-semibold mb-2">Public ENS Record</p>
        <p className="text-sm mb-2">
          This contract is registered on ENS, making it publicly verifiable.
        </p>
        <ul className="text-xs space-y-1 list-disc list-inside">
          <li>Anyone can view contract details</li>
          <li>Terms stored immutably on IPFS</li>
          <li>No Civitas account needed</li>
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}
```

---

## 10. Milestones & Timeline

### Week 1: Smart Contract Foundation
- [ ] Create `IENSResolver` and `IENSReverseRegistrar` interfaces
- [ ] Extend `CivitasFactory` with ENS record writing
- [ ] Add `getENSMetadata()` to all 3 templates
- [ ] Write comprehensive tests for ENS integration
- [ ] Deploy to Base Sepolia testnet

**Deliverable**: Factory can set basic ENS records for deployed contracts

### Week 2: Backend Infrastructure
- [ ] Implement `ENSWriter` service
- [ ] Create `ContractEventListener` for automated ENS updates
- [ ] Build `IPFSUploader` for contract terms
- [ ] Add Supabase schema for ENS metadata cache
- [ ] Deploy event listener as background worker

**Deliverable**: Contracts automatically get ENS records on creation

### Week 3: Frontend & Discovery
- [ ] Build `useContractENSData()` hook
- [ ] Create public contract explorer page
- [ ] Add ENS metadata cards to existing contract pages
- [ ] Implement public verification tool (no wallet)
- [ ] Test with real ENS names on testnet

**Deliverable**: Users can discover and verify contracts via ENS

### Week 4: Production & Polish
- [ ] Deploy L1 resolver to Ethereum Sepolia
- [ ] Set up CCIP-Read gateway (if needed for L1↔L2)
- [ ] Implement public REST API for third parties
- [ ] Write comprehensive documentation
- [ ] Security audit of ENS integration
- [ ] Deploy to mainnet

**Deliverable**: Fully functional public ENS registry

---

## 11. Success Metrics

### Technical Metrics
- [ ] 100% of new contracts receive ENS records within 5 minutes
- [ ] ENS resolution latency < 500ms (via cache)
- [ ] Zero ENS record update failures
- [ ] IPFS terms available 99.9% uptime

### User Metrics
- [ ] 50+ contracts with public ENS records
- [ ] 100+ external verifications (no wallet)
- [ ] 10+ third-party integrations using our API
- [ ] Featured in ENS showcase/blog

### Prize Track Alignment

**Best AI x LI.FI Smart App** ($2,000):
- ✅ AI generates semantic ENS names
- ✅ Cross-chain funding to ENS-registered contracts
- ✅ Automated record updates via AI-driven state machine

**Most Creative Use of ENS for DeFi** ($1,500):
- ✅ ENS as public legal registry (not just name→address)
- ✅ Text records store structured contract metadata
- ✅ External parties can verify contracts without dApp
- ✅ IPFS + ENS = immutable legal framework
- ✅ Multi-template support (rent, escrow, treasury)

---

## 12. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| ENS mainnet costs too high | High | Use Base L2 + CCIP-Read gateway |
| IPFS gateway downtime | Medium | Use multiple gateways (Pinata, Infura, public) |
| Record update failures | Medium | Retry logic + manual override UI |
| Privacy concerns | Low | Document public vs private data clearly |
| Subdomain management | Medium | Automate via backend, manual fallback |

---

## 13. Future Enhancements (Post-Hackathon)

### 13.1 Advanced Features
- **On-Chain Dispute Resolution**: Store dispute status in ENS
- **Multi-Language Terms**: IPFS folder with translations
- **Contract Analytics**: Public stats via ENS text records
- **DAO Governance**: ENS records for governance proposals

### 13.2 Additional Templates
- **Vesting Schedules**: `contract.vesting.cliff`, `contract.vesting.duration`
- **Payment Splitter**: `contract.split.recipients`, `contract.split.shares`
- **Betting Pool**: `contract.bet.condition`, `contract.bet.oracle`

### 13.3 Cross-Chain Expansion
- Support Optimism, Arbitrum, Polygon via separate subdomains
- Unified search across all chains
- Chain-specific coinType addresses (ENSIP-11)

---

## 14. Resources & References

### ENS Documentation
- [ENS Docs](https://docs.ens.domains)
- [Smart Contract Guides](https://docs.ens.domains/contract-api-reference/ens)
- [ENSIP-5: Text Records](https://docs.ens.domains/ens-improvement-proposals/ensip-5-text-records)
- [ENSIP-11: EVM Chain Address Resolution](https://docs.ens.domains/ens-improvement-proposals/ensip-11-evm-chain-address-resolution)
- [CCIP-Read (ERC-3668)](https://eips.ethereum.org/EIPS/eip-3668)

### Libraries
- [viem](https://viem.sh/docs/ens/actions/getEnsText.html) - ENS resolution
- [wagmi](https://wagmi.sh/react/hooks/useEnsText) - React hooks for ENS
- [@ensdomains/ens-contracts](https://github.com/ensdomains/ens-contracts) - Solidity contracts

### Tools
- [ENS Manager App](https://app.ens.domains) - Manual record management
- [ENS Subgraph](https://thegraph.com/explorer/subgraphs/5XqPmWe6gjyrJtFn9cLy237i4cWw2j9HcUJEXsP5qGtH) - Query ENS data
- [IPFS](https://ipfs.io) - Decentralized storage

---

## Appendix A: Contract Metadata JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Civitas Contract Metadata",
  "type": "object",
  "required": ["contract.type", "contract.status", "contract.created"],
  "properties": {
    "contract.type": {
      "type": "string",
      "enum": ["RentVault", "GroupBuyEscrow", "StableAllowanceTreasury"]
    },
    "contract.status": {
      "type": "string",
      "enum": ["Deployed", "Active", "Completed", "Terminated", "Expired"]
    },
    "contract.version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$"
    },
    "contract.created": {
      "type": "string",
      "format": "date-time"
    },
    "contract.participants": {
      "type": "string",
      "description": "JSON array of participant addresses"
    },
    "contract.terms": {
      "type": "string",
      "pattern": "^ipfs://",
      "description": "IPFS hash of full contract terms"
    },
    "legal.jurisdiction": {
      "type": "string",
      "description": "ISO 3166-2 code (e.g., US-CA, GB-ENG)"
    },
    "legal.type": {
      "type": "string",
      "enum": ["residential_lease", "commercial_lease", "escrow", "treasury", "other"]
    },
    "legal.hash": {
      "type": "string",
      "pattern": "^0x[a-fA-F0-9]{64}$",
      "description": "SHA-256 hash of contract terms for verification"
    },
    "url": {
      "type": "string",
      "format": "uri",
      "description": "Link to Civitas dashboard"
    },
    "avatar": {
      "type": "string",
      "description": "Contract icon (IPFS hash or data URI)"
    }
  }
}
```

---

## Appendix B: CLI Tools for Testing

**File**: `scripts/test-ens-resolution.ts`

```typescript
#!/usr/bin/env tsx

import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';

const client = createPublicClient({
  chain: mainnet,
  transport: http(process.env.MAINNET_RPC_URL),
});

async function testENS(name: string) {
  console.log(`Testing ENS resolution for: ${name}\n`);

  // Forward resolution
  const address = await client.getEnsAddress({ name });
  console.log(`✓ Address: ${address}`);

  // Text records
  const records = ['contract.type', 'contract.status', 'contract.terms'];
  for (const key of records) {
    const value = await client.getEnsText({ name, key });
    console.log(`✓ ${key}: ${value}`);
  }

  // Reverse resolution
  if (address) {
    const reverseName = await client.getEnsName({ address });
    console.log(`✓ Reverse: ${reverseName}`);
    console.log(reverseName === name ? '✓ Verified!' : '✗ Mismatch');
  }
}

// Run: tsx scripts/test-ens-resolution.ts contract-name.civitas.base.eth
testENS(process.argv[2] || 'test.civitas.base.eth');
```

---

**END OF PLAN**

This implementation plan provides a comprehensive roadmap for integrating ENS into Civitas as a public contract registry. The key innovation is using ENS text records as a legally verifiable data layer, enabling external parties to audit contracts without relying on the Civitas platform.
