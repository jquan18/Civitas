import { base, baseSepolia } from 'viem/chains';
import type { NetworkMode } from '@/config/environment';

// Chain configuration
export const SUPPORTED_CHAINS = [base, baseSepolia] as const;

// Base USDC addresses
export const USDC_ADDRESS: Record<number, `0x${string}`> = {
  [base.id]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  [baseSepolia.id]: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
};

export const USDC_DECIMALS = 6;

// CivitasFactory addresses (chain-ID-based, matching frontend pattern)
export const CIVITAS_FACTORY_ADDRESS: Record<number, `0x${string}`> = {
  [baseSepolia.id]: '0xa44EbCC68383fc6761292A4D5Ec13127Cc123B56',
  [base.id]: '0xAF4D13Cac35b65d24203962fF22Dc281f1C1Fc5C',
};

// Helper to get factory address based on network mode
export function getFactoryAddress(networkMode: NetworkMode): `0x${string}` {
  const chainId = networkMode === 'mainnet' ? base.id : baseSepolia.id;
  return CIVITAS_FACTORY_ADDRESS[chainId];
}

// Helper to get chain ID based on network mode
export function getChainId(networkMode: NetworkMode): number {
  return networkMode === 'mainnet' ? base.id : baseSepolia.id;
}

// Helper to get chain based on network mode
export function getChain(networkMode: NetworkMode) {
  return networkMode === 'mainnet' ? base : baseSepolia;
}

// Time constants
export const MONTH_DURATION = 30 * 24 * 60 * 60; // 30 days in seconds
export const MAX_DURATION_MONTHS = 60;
export const TERMINATION_NOTICE_PERIOD = 30 * 24 * 60 * 60; // 30 days in seconds

// Chain-specific configs
export const CHAIN_CONFIG = {
  [base.id]: {
    name: 'Base',
    rpcUrl: 'https://mainnet.base.org',
    blockExplorer: 'https://basescan.org',
  },
  [baseSepolia.id]: {
    name: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    blockExplorer: 'https://sepolia.basescan.org',
  },
} as const;
