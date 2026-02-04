import { base, baseSepolia } from 'wagmi/chains';

// ============================================================================
// Chain Configuration
// ============================================================================

export const SUPPORTED_CHAINS = [base, baseSepolia] as const;
export const DEFAULT_CHAIN = baseSepolia; // Using testnet as default

// ============================================================================
// CivitasFactory Addresses (Base Sepolia Deployment)
// ============================================================================

export const CIVITAS_FACTORY_ADDRESS: Record<number, `0x${string}`> = {
  [baseSepolia.id]: '0x1cF969a2D882A09927f051D4F8e9e31160Abe894',
  [base.id]: '0xa44EbCC68383fc6761292A4D5Ec13127Cc123B56', // TODO: Update when deployed to mainnet
};

export const RENT_VAULT_IMPL: Record<number, `0x${string}`> = {
  [baseSepolia.id]: '0x9F88C58521693d0A02554C0b079aFf679DAB261E',
  [base.id]: '0x98EB94D9948c9CedeCeaB4e3E4aDEbb199F9faf7', // TODO: Update when deployed to mainnet
};

export const GROUP_BUY_ESCROW_IMPL: Record<number, `0x${string}`> = {
  [baseSepolia.id]: '0x7107651cD170931EA3caF552299CEA49D7EC7a6E',
  [base.id]: '0x43066b4557cCfa5a25f77f151a871Dd591C0f2F5', // TODO: Update when deployed to mainnet
};

export const STABLE_ALLOWANCE_TREASURY_IMPL: Record<number, `0x${string}`> = {
  [baseSepolia.id]: '0x1d71697D9420f218e75cC2ceb70C255BE1B62550',
  [base.id]: '0x86CCC5d79bF369FC38d2210138007b66D4Dd8433', // TODO: Update when deployed to mainnet
};

// ============================================================================
// USDC Token Addresses
// ============================================================================

export const USDC_ADDRESS: Record<number, `0x${string}`> = {
  [base.id]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  [baseSepolia.id]: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
};

export const USDC_DECIMALS = 6;

// ============================================================================
// Contract Template Types
// ============================================================================

export const CONTRACT_TEMPLATES = {
  RENT_VAULT: 'RentVault',
  GROUP_BUY_ESCROW: 'GroupBuyEscrow',
  STABLE_ALLOWANCE_TREASURY: 'StableAllowanceTreasury',
} as const;

export type ContractTemplate = typeof CONTRACT_TEMPLATES[keyof typeof CONTRACT_TEMPLATES];

// ============================================================================
// Time Constants
// ============================================================================

export const MONTH_DURATION = 30 * 24 * 60 * 60; // 30 days in seconds
export const MAX_DURATION_MONTHS = 60;
export const TERMINATION_NOTICE_PERIOD = 30 * 24 * 60 * 60; // 30 days in seconds

// ============================================================================
// Chain-Specific Configs
// ============================================================================

export const CHAIN_CONFIG = {
  [base.id]: {
    name: 'Base',
    rpcUrl: process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org',
    blockExplorer: 'https://basescan.org',
  },
  [baseSepolia.id]: {
    name: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    blockExplorer: 'https://sepolia.basescan.org',
  },
} as const;

// ============================================================================
// Convenience Exports
// ============================================================================

export const BASE_USDC_ADDRESS = USDC_ADDRESS[baseSepolia.id]; // Default to testnet
