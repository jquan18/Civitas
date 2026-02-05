import { createPublicClient, http } from 'viem';
import { base, baseSepolia } from 'viem/chains';

/**
 * Get a public client (provider) for blockchain reads
 * Used for fetching transaction receipts, blocks, and other on-chain data
 */
export function getPublicClient(chainId: number) {
  const chain = chainId === 8453 ? base : baseSepolia;

  const rpcUrl = chainId === 8453
    ? (process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org')
    : (process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org');

  return createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
}
