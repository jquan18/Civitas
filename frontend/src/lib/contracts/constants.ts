import { base, baseSepolia } from 'wagmi/chains';

// Chain configuration
export const SUPPORTED_CHAINS = [base, baseSepolia] as const;

export const DEFAULT_CHAIN = base;

// Base USDC address (same across mainnet and testnet)
export const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const;

export const USDC_DECIMALS = 6;

// Contract addresses (will be set after deployment)
export const FACTORY_ADDRESS = (process.env.NEXT_PUBLIC_FACTORY_ADDRESS ||
  '0x0000000000000000000000000000000000000000') as `0x${string}`;

export const RENTAL_IMPLEMENTATION = (process.env.NEXT_PUBLIC_RENTAL_IMPLEMENTATION ||
  '0x0000000000000000000000000000000000000000') as `0x${string}`;

// Time constants
export const MONTH_DURATION = 30 * 24 * 60 * 60; // 30 days in seconds
export const MAX_DURATION_MONTHS = 60;
export const TERMINATION_NOTICE_PERIOD = 30 * 24 * 60 * 60; // 30 days in seconds

// Chain-specific configs
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
