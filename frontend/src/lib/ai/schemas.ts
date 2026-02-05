import { z } from 'zod';

// ============================================
// Legacy Rental Schema (keep for backward compatibility)
// ============================================
export const RentalConfigSchema = z.object({
  tenant: z.string().describe('ENS name or Ethereum address'),
  monthlyAmount: z.number().positive().describe('Monthly rent in USDC'),
  totalMonths: z.number().int().min(1).max(60).describe('Duration in months'),
  needsClarification: z.boolean().optional().describe('Whether AI needs more info'),
  clarificationQuestion: z.string().optional().describe('Question to ask user'),
});

export type RentalConfig = z.infer<typeof RentalConfigSchema>;

// ============================================
// Multi-Template Schemas
// ============================================

/**
 * Validates address-like inputs: 0x addresses, ENS names (.eth), or "me" references
 */
const AddressOrReferenceSchema = z.string().refine(
  (val) => {
    if (val.toLowerCase() === 'me') return true;
    const lower = val.toLowerCase();
    if (lower.endsWith('.eth') || lower.endsWith('.base.eth') || lower.endsWith('.basetest.eth')) {
      return true;
    }
    if (/^0x[a-fA-F0-9]{40}$/.test(val)) return true;
    return false;
  },
  { message: 'Must be a valid Ethereum address (0x...), ENS name (.eth), or "me"' }
);

// Rent Vault: Multi-tenant rent collection
export const RentVaultConfigSchema = z.object({
  recipient: AddressOrReferenceSchema
    .optional()
    .describe('Landlord/recipient Ethereum address'),
  rentAmount: z.string()
    .optional()
    .describe('Total rent amount in USDC (will be converted to 6 decimals)'),
  dueDate: z.string()
    .optional()
    .describe('Due date as ISO 8601 date string (e.g., "2026-02-02T00:00:00.000Z") or Unix timestamp. MUST be specific future date in ISO format, NOT relative phrases like "2nd of month"'),
  tenants: z.array(AddressOrReferenceSchema)
    .optional()
    .describe('Array of tenant Ethereum addresses'),
  shareBps: z.array(z.number().int().positive())
    .optional()
    .describe('Share basis points per tenant (must sum to 10000)'),
});

export type RentVaultConfig = z.infer<typeof RentVaultConfigSchema>;

// Group Buy Escrow: Group purchase with voting
export const GroupBuyEscrowConfigSchema = z.object({
  recipient: AddressOrReferenceSchema
    .optional()
    .describe('Seller/recipient Ethereum address'),
  fundingGoal: z.string()
    .optional()
    .describe('Total funding goal in USDC'),
  expiryDate: z.string()
    .optional()
    .describe('Funding deadline as ISO 8601 date string (e.g., "2026-03-15T00:00:00.000Z"). MUST be specific future date in ISO format, NOT relative phrases'),
  timelockRefundDelay: z.string()
    .optional()
    .describe('Delay in seconds after goal reached before timelock refund is available'),
  participants: z.array(AddressOrReferenceSchema)
    .optional()
    .describe('Array of participant Ethereum addresses'),
  shareBps: z.array(z.number().int().positive())
    .optional()
    .describe('Share basis points per participant (must sum to 10000)'),
});

export type GroupBuyEscrowConfig = z.infer<typeof GroupBuyEscrowConfigSchema>;

// Stable Allowance Treasury: Counter-based allowance
export const StableAllowanceTreasuryConfigSchema = z.object({
  owner: AddressOrReferenceSchema
    .optional()
    .describe('Owner/controller Ethereum address (e.g., parent)'),
  recipient: AddressOrReferenceSchema
    .optional()
    .describe('Recipient Ethereum address (e.g., child)'),
  allowancePerIncrement: z.string()
    .optional()
    .describe('Fixed USDC amount per claim'),
});

export type StableAllowanceTreasuryConfig = z.infer<typeof StableAllowanceTreasuryConfigSchema>;

// ============================================
// Basename Generation
// ============================================
export const NameSuggestionSchema = z.object({
  suggestedName: z.string().max(20).describe('Semantic subdomain name (lowercase, hyphenated)'),
  reasoning: z.string().optional().describe('Why this name was chosen'),
});

export type NameSuggestion = z.infer<typeof NameSuggestionSchema>;
