import { base, baseSepolia } from 'wagmi/chains';
import type { NetworkMode } from '@/lib/config/networks';

// ============================================================================
// Chain Configuration
// ============================================================================

export const SUPPORTED_CHAINS = [base, baseSepolia] as const;

// Dynamic chain selection based on network mode
export function getDefaultChain(networkMode: NetworkMode) {
  return networkMode === 'mainnet' ? base : baseSepolia;
}

export function getTargetChainId(networkMode: NetworkMode): number {
  return networkMode === 'mainnet' ? base.id : baseSepolia.id;
}

// ============================================================================
// CivitasFactory Addresses
// ============================================================================

export const CIVITAS_FACTORY_ADDRESS: Record<number, `0x${string}`> = {
  [baseSepolia.id]: '0xa44EbCC68383fc6761292A4D5Ec13127Cc123B56',
  [base.id]: '0xAF4D13Cac35b65d24203962fF22Dc281f1C1Fc5C', // Base Mainnet (deployed)
};

export const RENT_VAULT_IMPL: Record<number, `0x${string}`> = {
  [baseSepolia.id]: '0x98EB94D9948c9CedeCeaB4e3E4aDEbb199F9faf7',
  [base.id]: '0x48F9b605171E2ce2E04739f3b3b3fae9716445C0', // Base Mainnet (deployed)
};

export const GROUP_BUY_ESCROW_IMPL: Record<number, `0x${string}`> = {
  [baseSepolia.id]: '0x43066b4557cCfa5a25f77f151a871Dd591C0f2F5',
  [base.id]: '0x8AFAA299F9CB43F64A2C2b5aa0acC1d92FfF3595', // Base Mainnet (deployed)
};

export const STABLE_ALLOWANCE_TREASURY_IMPL: Record<number, `0x${string}`> = {
  [baseSepolia.id]: '0x86CCC5d79bF369FC38d2210138007b66D4Dd8433',
  [base.id]: '0x8eb38e1C054D212b153FC28Ae16595fabfe49174', // Base Mainnet (deployed)
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
// ENS Configuration
// ============================================================================

export const ENS_L2_RESOLVER: Record<number, `0x${string}`> = {
  [baseSepolia.id]: '0x6533C94869D28fAA8dF77cc63f9e2b2D6Cf77eBA',
  [base.id]: '0xC6d566A56A1aFf6508b41f6c90ff131615583BCD', // Base Mainnet L2 Resolver
};

export const CIVITAS_ENS_DOMAIN: Record<number, string> = {
  [baseSepolia.id]: 'civitas.basetest.eth',
  [base.id]: 'civitas.base.eth',
};

export function getCivitasEnsDomain(chainId: number): string {
  return CIVITAS_ENS_DOMAIN[chainId] || CIVITAS_ENS_DOMAIN[baseSepolia.id];
}

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
    rpcUrl: process.env.NEXT_PUBLIC_BASE_MAINNET_RPC_URL || 'https://mainnet.base.org',
    blockExplorer: 'https://basescan.org',
  },
  [baseSepolia.id]: {
    name: 'Base Sepolia',
    rpcUrl: process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
    blockExplorer: 'https://sepolia.basescan.org',
  },
} as const;

// ============================================================================
// Convenience Functions
// ============================================================================

export function getUsdcAddress(chainId: number): `0x${string}` {
  return USDC_ADDRESS[chainId] || USDC_ADDRESS[baseSepolia.id];
}

export function getExplorerUrl(chainId: number): string {
  const config = CHAIN_CONFIG[chainId as keyof typeof CHAIN_CONFIG];
  return config?.blockExplorer || CHAIN_CONFIG[baseSepolia.id].blockExplorer;
}

export function getExplorerTxUrl(chainId: number, txHash: string): string {
  return `${getExplorerUrl(chainId)}/tx/${txHash}`;
}

export function getExplorerAddressUrl(chainId: number, address: string): string {
  return `${getExplorerUrl(chainId)}/address/${address}`;
}
