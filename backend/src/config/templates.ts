import {
  RENT_VAULT_ABI,
  GROUP_BUY_ESCROW_ABI,
  STABLE_ALLOWANCE_TREASURY_ABI,
} from '@/lib/contracts/abis'

export interface TemplateParam {
  name: string
  type: string
  description: string
  isArray?: boolean
}

export interface TemplateDefinition {
  id: string
  name: string
  description: string
  factoryFunctionName: string
  factoryEventName: string
  abi: readonly Record<string, unknown>[]
  params: TemplateParam[]
  stateFields: string[]
  roles: string[]
}

export const TEMPLATES: Record<string, TemplateDefinition> = {
  rent_vault: {
    id: 'rent_vault',
    name: 'Rent Vault',
    description:
      'Multi-tenant rent vault. Tenants deposit their share; landlord withdraws once fully funded.',
    factoryFunctionName: 'createRentVault',
    factoryEventName: 'RentVaultCreated',
    abi: RENT_VAULT_ABI,
    params: [
      { name: 'recipient', type: 'address', description: 'Landlord/recipient address' },
      { name: 'rentAmount', type: 'uint256', description: 'Total rent amount (USDC, 6 decimals)' },
      { name: 'dueDate', type: 'uint256', description: 'Unix timestamp for rent due date' },
      { name: 'tenants', type: 'address[]', description: 'Tenant addresses', isArray: true },
      { name: 'shareBps', type: 'uint256[]', description: 'Share basis points per tenant (must sum to 10000)', isArray: true },
    ],
    stateFields: ['recipient', 'rentAmount', 'dueDate', 'totalDeposited', 'withdrawn'],
    roles: ['recipient', 'tenant'],
  },
  group_buy_escrow: {
    id: 'group_buy_escrow',
    name: 'Group Buy Escrow',
    description:
      'Group purchase escrow with majority vote release. Participants fund a goal; delivery confirmed by recipient; majority vote releases funds.',
    factoryFunctionName: 'createGroupBuyEscrow',
    factoryEventName: 'GroupBuyEscrowCreated',
    abi: GROUP_BUY_ESCROW_ABI,
    params: [
      { name: 'recipient', type: 'address', description: 'Purchaser/recipient address' },
      { name: 'fundingGoal', type: 'uint256', description: 'Total funding goal (USDC, 6 decimals)' },
      { name: 'expiryDate', type: 'uint256', description: 'Unix timestamp for funding expiry' },
      { name: 'timelockRefundDelay', type: 'uint256', description: 'Seconds after goal reached before timelock refund is available' },
      { name: 'participants', type: 'address[]', description: 'Participant addresses', isArray: true },
      { name: 'shareBps', type: 'uint256[]', description: 'Share basis points per participant (must sum to 10000)', isArray: true },
    ],
    stateFields: [
      'recipient', 'fundingGoal', 'expiryDate', 'timelockRefundDelay',
      'totalDeposited', 'goalReachedAt', 'deliveryConfirmedAt', 'released',
      'yesVotes', 'participantCount',
    ],
    roles: ['recipient', 'participant'],
  },
  stable_allowance_treasury: {
    id: 'stable_allowance_treasury',
    name: 'Stable Allowance Treasury',
    description:
      'Counter-based allowance treasury. Owner approves increments; recipient claims fixed USDC amounts.',
    factoryFunctionName: 'createStableAllowanceTreasury',
    factoryEventName: 'TreasuryCreated',
    abi: STABLE_ALLOWANCE_TREASURY_ABI,
    params: [
      { name: 'owner', type: 'address', description: 'Owner/controller address (e.g., parent)' },
      { name: 'recipient', type: 'address', description: 'Recipient address (e.g., child)' },
      { name: 'allowancePerIncrement', type: 'uint256', description: 'Fixed USDC amount per claim (6 decimals)' },
    ],
    stateFields: [
      'owner', 'recipient', 'allowancePerIncrement',
      'approvalCounter', 'claimedCount', 'state',
    ],
    roles: ['owner', 'recipient'],
  },
}

export function getTemplate(templateId: string): TemplateDefinition | undefined {
  // Direct lookup first (snake_case keys)
  if (TEMPLATES[templateId]) return TEMPLATES[templateId]

  // Normalize PascalCase/camelCase to snake_case for DB compatibility
  // e.g. "RentVault" -> "rent_vault", "StableAllowanceTreasury" -> "stable_allowance_treasury"
  const normalized = templateId.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase()
  return TEMPLATES[normalized]
}

export function getAllTemplates(): TemplateDefinition[] {
  return Object.values(TEMPLATES)
}
