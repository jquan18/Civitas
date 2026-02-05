import { parseUnits } from 'viem';
import type {
  RentVaultParams,
  GroupBuyEscrowParams,
  StableAllowanceTreasuryParams,
} from '@/hooks/useCivitasContractDeploy';
import type {
  RentVaultConfig,
  GroupBuyEscrowConfig,
  StableAllowanceTreasuryConfig,
} from '@/lib/ai/schemas';
import {
  batchResolveENS,
  isAddress,
  isENSName,
  type ENSResolutionResult
} from '@/lib/ens/resolver';

/**
 * Result of resolving all ENS names in a config
 */
export interface ENSResolutionReport {
  success: boolean;
  resolvedConfig: any;
  resolutions: Map<string, ENSResolutionResult>;
  errors: string[];
}

/**
 * Check if a string is a "me" reference (case-insensitive)
 */
function isMeReference(value: string): boolean {
  return value.toLowerCase() === 'me';
}

/**
 * Resolve all "me" references in config to walletAddress
 * Must be called BEFORE ENS resolution
 */
export function resolveMeReferences(
  templateId: string,
  config: any,
  walletAddress: `0x${string}` | undefined
): any {
  const resolvedConfig = JSON.parse(JSON.stringify(config));

  const replaceMeIfNeeded = (value: string | undefined): string | undefined => {
    if (!value) return value;
    if (isMeReference(value)) {
      if (!walletAddress) {
        throw new Error(
          'Cannot resolve "me" reference: wallet not connected. ' +
          'Please connect your wallet to use "me" in contract configuration.'
        );
      }
      return walletAddress;
    }
    return value;
  };

  switch (templateId) {
    case 'rent-vault': {
      const c = resolvedConfig as RentVaultConfig;
      c.recipient = replaceMeIfNeeded(c.recipient);
      if (c.tenants) {
        c.tenants = c.tenants.map((tenant: string) => {
          const replaced = replaceMeIfNeeded(tenant);
          if (!replaced) throw new Error('Tenant address cannot be empty after resolution');
          return replaced;
        });
      }
      break;
    }
    case 'group-buy-escrow': {
      const c = resolvedConfig as GroupBuyEscrowConfig;
      c.recipient = replaceMeIfNeeded(c.recipient);
      if (c.participants) {
        c.participants = c.participants.map((participant: string) => {
          const replaced = replaceMeIfNeeded(participant);
          if (!replaced) throw new Error('Participant address cannot be empty after resolution');
          return replaced;
        });
      }
      break;
    }
    case 'stable-allowance-treasury': {
      const c = resolvedConfig as StableAllowanceTreasuryConfig;
      c.owner = replaceMeIfNeeded(c.owner);
      c.recipient = replaceMeIfNeeded(c.recipient);
      break;
    }
  }

  return resolvedConfig;
}

/**
 * Extract all address/ENS fields from a config that need resolution
 */
function extractAddressFields(templateId: string, config: any): string[] {
  const fields: string[] = [];

  switch (templateId) {
    case 'rent-vault': {
      const c = config as RentVaultConfig;
      if (c.recipient) fields.push(c.recipient);
      if (c.tenants) fields.push(...c.tenants);
      break;
    }
    case 'group-buy-escrow': {
      const c = config as GroupBuyEscrowConfig;
      if (c.recipient) fields.push(c.recipient);
      if (c.participants) fields.push(...c.participants);
      break;
    }
    case 'stable-allowance-treasury': {
      const c = config as StableAllowanceTreasuryConfig;
      if (c.owner) fields.push(c.owner);
      if (c.recipient) fields.push(c.recipient);
      break;
    }
  }

  return fields;
}

/**
 * Resolve all ENS names in a config and return resolved config + report
 */
export async function resolveConfigENSNames(
  templateId: string,
  config: any
): Promise<ENSResolutionReport> {
  const addressFields = extractAddressFields(templateId, config);
  const errors: string[] = [];

  // Filter to only ENS names (addresses don't need resolution)
  const ensNames = addressFields.filter(f => isENSName(f));
  const rawAddresses = addressFields.filter(f => isAddress(f));

  // If no ENS names, return config as-is
  if (ensNames.length === 0) {
    const resolutions = new Map<string, ENSResolutionResult>();
    rawAddresses.forEach(addr => {
      resolutions.set(addr, {
        address: addr as `0x${string}`,
        source: 'raw',
        originalInput: addr,
      });
    });

    return {
      success: true,
      resolvedConfig: config,
      resolutions,
      errors: [],
    };
  }

  // Batch resolve all ENS names
  const resolutions = await batchResolveENS([...ensNames, ...rawAddresses]);

  // Check for resolution failures
  for (const [input, result] of resolutions) {
    if (!result.address && isENSName(input)) {
      errors.push(`Failed to resolve "${input}": ${result.error || 'Unknown error'}`);
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      resolvedConfig: config,
      resolutions,
      errors,
    };
  }

  // Create resolved config by replacing ENS names with addresses
  const resolvedConfig = JSON.parse(JSON.stringify(config));

  switch (templateId) {
    case 'rent-vault': {
      if (resolvedConfig.recipient) {
        const result = resolutions.get(resolvedConfig.recipient);
        if (result?.address) resolvedConfig.recipient = result.address;
      }
      if (resolvedConfig.tenants) {
        resolvedConfig.tenants = resolvedConfig.tenants.map((t: string) => {
          const result = resolutions.get(t);
          return result?.address || t;
        });
      }
      break;
    }
    case 'group-buy-escrow': {
      if (resolvedConfig.recipient) {
        const result = resolutions.get(resolvedConfig.recipient);
        if (result?.address) resolvedConfig.recipient = result.address;
      }
      if (resolvedConfig.participants) {
        resolvedConfig.participants = resolvedConfig.participants.map((p: string) => {
          const result = resolutions.get(p);
          return result?.address || p;
        });
      }
      break;
    }
    case 'stable-allowance-treasury': {
      if (resolvedConfig.owner) {
        const result = resolutions.get(resolvedConfig.owner);
        if (result?.address) resolvedConfig.owner = result.address;
      }
      if (resolvedConfig.recipient) {
        const result = resolutions.get(resolvedConfig.recipient);
        if (result?.address) resolvedConfig.recipient = result.address;
      }
      break;
    }
  }

  return {
    success: true,
    resolvedConfig,
    resolutions,
    errors: [],
  };
}

/**
 * Parse a date string to BigInt Unix timestamp
 * Handles ISO 8601 strings and numeric timestamps
 * Throws descriptive errors for invalid formats
 */
function parseDateToBigInt(dateStr: string, fieldName: string = 'date'): bigint {
  // Try ISO format (YYYY-MM-DD or full ISO 8601)
  if (dateStr.includes('-') || dateStr.includes('T')) {
    const timestamp = new Date(dateStr).getTime();
    
    if (isNaN(timestamp)) {
      throw new Error(
        `Invalid ${fieldName} format: "${dateStr}". ` +
        `Expected ISO 8601 date (e.g., "2026-02-02T00:00:00.000Z"), but received an unparseable date string.`
      );
    }
    
    return BigInt(Math.floor(timestamp / 1000));
  }
  
  // Try numeric timestamp
  if (/^\d+$/.test(dateStr)) {
    return BigInt(dateStr);
  }
  
  // Invalid format - provide helpful error
  throw new Error(
    `Cannot parse ${fieldName}: "${dateStr}". ` +
    `Expected ISO 8601 date (e.g., "2026-02-02T00:00:00.000Z") or Unix timestamp, ` +
    `but received natural language or invalid format. ` +
    `Please ask the AI to provide a specific date like "February 2nd, 2026" and try again.`
  );
}

/**
 * Transform AI-extracted config to deployment parameters
 */
export function transformConfigToDeployParams(
  templateId: string,
  config: any
): RentVaultParams | GroupBuyEscrowParams | StableAllowanceTreasuryParams {
  switch (templateId) {
    case 'rent-vault': {
      const c = config as RentVaultConfig;

      // Parse rent amount (could be string with commas or just a number string)
      const rentAmountStr = c.rentAmount.replace(/,/g, '');
      const rentAmount = parseUnits(rentAmountStr, 6);

      // Parse due date with validation
      const dueDate = parseDateToBigInt(c.dueDate, 'due date');
      
      // Convert shareBps to bigint array
      const shareBps = c.shareBps.map(s => BigInt(s));
      
      return {
        recipient: c.recipient as `0x${string}`,
        rentAmount,
        dueDate,
        tenants: c.tenants as `0x${string}`[],
        shareBps,
      };
    }

    case 'group-buy-escrow': {
      const c = config as GroupBuyEscrowConfig;

      // Parse funding goal
      const fundingGoalStr = c.fundingGoal.replace(/,/g, '');
      const fundingGoal = parseUnits(fundingGoalStr, 6);

      // Parse expiry date with validation
      const expiryDate = parseDateToBigInt(c.expiryDate, 'expiry date');
      
      // Parse timelock delay (could be in days, convert to seconds)
      if (!c.timelockRefundDelay) {
        throw new Error('Timelock refund delay is required');
      }
      let timelockRefundDelay: bigint;
      const delayStr = (c.timelockRefundDelay || '0').replace(/,/g, '');
      const delayNum = parseFloat(delayStr);
      // If less than 1000, assume days and convert to seconds
      if (delayNum < 1000) {
        timelockRefundDelay = BigInt(Math.floor(delayNum * 86400));
      } else {
        timelockRefundDelay = BigInt(delayNum);
      }

      // Convert shareBps to bigint array
      const shareBps = c.shareBps.map(s => BigInt(s));
      
      return {
        recipient: c.recipient as `0x${string}`,
        fundingGoal,
        expiryDate,
        timelockRefundDelay,
        participants: c.participants as `0x${string}`[],
        shareBps,
      };
    }

    case 'stable-allowance-treasury': {
      const c = config as StableAllowanceTreasuryConfig;

      // Parse allowance amount
      const allowanceStr = c.allowancePerIncrement.replace(/,/g, '');
      const allowancePerIncrement = parseUnits(allowanceStr, 6);
      
      return {
        owner: c.owner as `0x${string}`,
        recipient: c.recipient as `0x${string}`,
        allowancePerIncrement,
      };
    }

    default:
      throw new Error(`Unknown template: ${templateId}`);
  }
}

/**
 * Validate config before deployment
 */
export function validateConfig(templateId: string, config: any): string | null {
  switch (templateId) {
    case 'rent-vault': {
      const c = config as RentVaultConfig;
      if (!c.recipient || !c.rentAmount || !c.dueDate || !c.tenants || !c.shareBps) {
        return 'Missing required fields';
      }
      if (c.tenants.length === 0) {
        return 'At least one tenant required';
      }
      if (c.tenants.length !== c.shareBps.length) {
        return 'Tenants and shareBps arrays must be same length';
      }
      const totalBps = c.shareBps.reduce((sum, bps) => sum + bps, 0);
      if (totalBps !== 10000) {
        return `Share basis points must sum to 10,000 (currently ${totalBps})`;
      }
      return null;
    }

    case 'group-buy-escrow': {
      const c = config as GroupBuyEscrowConfig;
      if (!c.recipient || !c.fundingGoal || !c.expiryDate || !c.timelockRefundDelay || !c.participants || !c.shareBps) {
        return 'Missing required fields';
      }
      if (c.participants.length === 0) {
        return 'At least one participant required';
      }
      if (c.participants.length !== c.shareBps.length) {
        return 'Participants and shareBps arrays must be same length';
      }
      const totalBps = c.shareBps.reduce((sum, bps) => sum + bps, 0);
      if (totalBps !== 10000) {
        return `Share basis points must sum to 10,000 (currently ${totalBps})`;
      }
      return null;
    }

    case 'stable-allowance-treasury': {
      const c = config as StableAllowanceTreasuryConfig;
      if (!c.owner || !c.recipient || !c.allowancePerIncrement) {
        return 'Missing required fields';
      }
      if (c.owner.toLowerCase() === c.recipient.toLowerCase()) {
        return 'Owner and recipient must be different addresses. You cannot be both the owner and recipient of an allowance treasury.';
      }
      return null;
    }

    default:
      return `Unknown template: ${templateId}`;
  }
}
