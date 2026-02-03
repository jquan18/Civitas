import { CONTRACT_TEMPLATES, type ContractTemplate } from './constants';

export interface TemplateInfo {
  name: string;
  description: string;
  icon: string;
  color: string;
}

export const TEMPLATE_INFO: Record<ContractTemplate, TemplateInfo> = {
  [CONTRACT_TEMPLATES.RENT_VAULT]: {
    name: 'Rent Vault',
    description: 'Split rent payments among multiple tenants',
    icon: '🏠',
    color: 'blue',
  },
  [CONTRACT_TEMPLATES.GROUP_BUY_ESCROW]: {
    name: 'Group Buy Escrow',
    description: 'Crowdfund purchases with majority voting',
    icon: '🤝',
    color: 'green',
  },
  [CONTRACT_TEMPLATES.STABLE_ALLOWANCE_TREASURY]: {
    name: 'Allowance Treasury',
    description: 'Controlled periodic fund releases',
    icon: '💰',
    color: 'purple',
  },
};

export interface ContractState {
  label: string;
  emoji: string;
  color: string;
}

export const CONTRACT_STATES: Record<number, ContractState> = {
  0: { label: 'Deployed', emoji: '🔴', color: 'gray' },
  1: { label: 'Active', emoji: '🟢', color: 'green' },
  2: { label: 'Completed', emoji: '✅', color: 'blue' },
  3: { label: 'Terminating', emoji: '🟣', color: 'purple' },
  4: { label: 'Terminated', emoji: '⚫', color: 'red' },
};

export function getTemplateInfo(templateId: ContractTemplate): TemplateInfo {
  return TEMPLATE_INFO[templateId] || {
    name: 'Unknown',
    description: 'Unknown contract type',
    icon: '❓',
    color: 'gray',
  };
}

export function getContractState(state: number): ContractState {
  return CONTRACT_STATES[state] || {
    label: 'Unknown',
    emoji: '❓',
    color: 'gray',
  };
}

// Type definitions for config JSON structures
export interface RentVaultConfig {
  recipient: string;
  rentAmount: string;
  dueDate: string;
  tenants: string[];
  shareBps: string[];
}

export interface GroupBuyEscrowConfig {
  recipient: string;
  fundingGoal: string;
  expiryDate: string;
  timelockRefundDelay: string;
  participants: string[];
  shareBps: string[];
}

export interface StableAllowanceTreasuryConfig {
  owner: string;
  recipient: string;
  allowancePerIncrement: string;
}

export type ContractConfig =
  | RentVaultConfig
  | GroupBuyEscrowConfig
  | StableAllowanceTreasuryConfig;

// Extract key display fields from config based on template
export function getConfigDisplayFields(templateId: ContractTemplate, config: any): Record<string, string> {
  switch (templateId) {
    case CONTRACT_TEMPLATES.RENT_VAULT: {
      const c = config as RentVaultConfig;
      return {
        'Recipient': c.recipient,
        'Rent Amount': `${(parseFloat(c.rentAmount) / 1e6).toFixed(2)} USDC`,
        'Due Date': new Date(parseInt(c.dueDate) * 1000).toLocaleDateString(),
        'Tenants': c.tenants.length.toString(),
      };
    }
    case CONTRACT_TEMPLATES.GROUP_BUY_ESCROW: {
      const c = config as GroupBuyEscrowConfig;
      return {
        'Recipient': c.recipient,
        'Funding Goal': `${(parseFloat(c.fundingGoal) / 1e6).toFixed(2)} USDC`,
        'Expiry Date': new Date(parseInt(c.expiryDate) * 1000).toLocaleDateString(),
        'Participants': c.participants.length.toString(),
      };
    }
    case CONTRACT_TEMPLATES.STABLE_ALLOWANCE_TREASURY: {
      const c = config as StableAllowanceTreasuryConfig;
      return {
        'Owner': c.owner,
        'Recipient': c.recipient,
        'Allowance': `${(parseFloat(c.allowancePerIncrement) / 1e6).toFixed(2)} USDC`,
      };
    }
    default:
      return {};
  }
}

// Format address for display (0x1234...5678)
export function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Get explorer URL for contract
export function getExplorerUrl(chainId: number, contractAddress: string): string {
  const explorers: Record<number, string> = {
    8453: 'https://basescan.org', // Base mainnet
    84532: 'https://sepolia.basescan.org', // Base Sepolia
  };
  const baseUrl = explorers[chainId] || 'https://basescan.org';
  return `${baseUrl}/address/${contractAddress}`;
}

// Get chain name
export function getChainName(chainId: number): string {
  const chains: Record<number, string> = {
    8453: 'Base',
    84532: 'Base Sepolia',
  };
  return chains[chainId] || `Chain ${chainId}`;
}
