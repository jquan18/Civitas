import { tool } from 'ai';
import { z } from 'zod';
import { createPublicClient, http, isAddress as viemIsAddress, formatUnits } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { USDC_ADDRESS, USDC_DECIMALS } from '@/lib/contracts/constants';
import { isENSName, isAddress, formatAddress } from '@/lib/ens/resolver';

/**
 * Resolve ENS names to Ethereum addresses
 * Supports L1 ENS (.eth), L2 Basenames (.base.eth, .basetest.eth), and raw addresses
 */
const resolveENS = tool({
  description:
    'Resolve ENS names (.eth, .base.eth, .basetest.eth) to Ethereum addresses. ' +
    'Also validates and formats raw Ethereum addresses. ' +
    'Use this when users mention ENS names or addresses.',
  inputSchema: z.object({
    name: z
      .string()
      .describe('ENS name (e.g., vitalik.eth, alice.base.eth) or Ethereum address (0x...)'),
  }),
  execute: async ({ name }) => {
    try {
      // If it's already a valid address, return it
      if (isAddress(name)) {
        return {
          success: true,
          input: name,
          address: name as `0x${string}`,
          shortAddress: formatAddress(name),
          source: 'raw' as const,
          isENS: false,
        };
      }

      // Check if it's an ENS name
      if (!isENSName(name)) {
        return {
          success: false,
          input: name,
          address: null,
          error: 'Input is neither a valid ENS name nor an Ethereum address',
          isENS: false,
        };
      }

      // Call the server-side ENS resolution API
      // Edge Runtime requires absolute URLs
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

      const response = await fetch(`${baseUrl}/api/resolve-ens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          input: name,
          address: null,
          error: errorData.error || `Resolution failed with status ${response.status}`,
          isENS: true,
        };
      }

      const data = await response.json();

      if (!data.address) {
        return {
          success: false,
          input: name,
          address: null,
          error: data.error || 'ENS name could not be resolved',
          isENS: true,
        };
      }

      return {
        success: true,
        input: name,
        address: data.address,
        shortAddress: formatAddress(data.address),
        source: data.source,
        isENS: true,
      };
    } catch (error: any) {
      console.error('resolveENS tool error:', error);
      return {
        success: false,
        input: name,
        address: null,
        error: error.message || 'Failed to resolve ENS name',
        isENS: isENSName(name),
      };
    }
  },
});

/**
 * Check USDC balance on Base Mainnet or Base Sepolia
 */
const checkBalance = tool({
  description:
    'Check USDC balance for an Ethereum address on Base (mainnet or testnet). ' +
    'Use this when users ask about balances or need to verify funding amounts.',
  inputSchema: z.object({
    address: z
      .string()
      .describe('Ethereum address to check balance for (must be a valid 0x... address)'),
    network: z
      .enum(['mainnet', 'testnet'])
      .default('testnet')
      .describe('Network to check (mainnet = Base, testnet = Base Sepolia)'),
  }),
  execute: async ({ address, network }) => {
    try {
      // Validate address format
      if (!viemIsAddress(address)) {
        return {
          success: false,
          address,
          network,
          error: 'Invalid Ethereum address format',
        };
      }

      // Select chain and USDC address based on network
      const chain = network === 'mainnet' ? base : baseSepolia;
      const usdcAddress = USDC_ADDRESS[chain.id];

      // Create public client
      const client = createPublicClient({
        chain,
        transport: http(),
      });

      // Read USDC balance
      const balance = await client.readContract({
        address: usdcAddress,
        abi: [
          {
            name: 'balanceOf',
            type: 'function',
            stateMutability: 'view',
            inputs: [{ name: 'account', type: 'address' }],
            outputs: [{ name: '', type: 'uint256' }],
          },
        ],
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
      });

      // Format balance for display
      const balanceFormatted = formatUnits(balance as bigint, USDC_DECIMALS);

      return {
        success: true,
        address,
        shortAddress: formatAddress(address),
        network,
        balance: (balance as bigint).toString(),
        balanceFormatted,
        balanceNumber: parseFloat(balanceFormatted),
        currency: 'USDC',
        chainName: chain.name,
      };
    } catch (error: any) {
      console.error('checkBalance tool error:', error);
      return {
        success: false,
        address,
        network,
        error: error.message || 'Failed to check balance',
      };
    }
  },
});

/**
 * Validate Ethereum address format and check if it's a contract or EOA
 */
const validateAddress = tool({
  description:
    'Validate Ethereum address format and determine if it is a smart contract or externally owned account (EOA). ' +
    'Use this when you need to verify address validity or check account type.',
  inputSchema: z.object({
    address: z.string().describe('Ethereum address to validate'),
    network: z
      .enum(['mainnet', 'testnet'])
      .default('testnet')
      .describe('Network to check on (mainnet = Base, testnet = Base Sepolia)'),
  }),
  execute: async ({ address, network }) => {
    try {
      // First check format
      const isValidFormat = viemIsAddress(address);

      if (!isValidFormat) {
        return {
          success: false,
          address,
          isValidFormat: false,
          error: 'Invalid Ethereum address format (must be 0x followed by 40 hex characters)',
        };
      }

      // Select chain based on network
      const chain = network === 'mainnet' ? base : baseSepolia;

      // Create public client
      const client = createPublicClient({
        chain,
        transport: http(),
      });

      // Check if address has bytecode (is a contract)
      const bytecode = await client.getBytecode({
        address: address as `0x${string}`,
      });

      const isContract = bytecode !== undefined && bytecode !== '0x';

      return {
        success: true,
        address,
        shortAddress: formatAddress(address),
        isValidFormat: true,
        isContract,
        accountType: isContract ? 'Smart Contract' : 'EOA (Externally Owned Account)',
        network,
        chainName: chain.name,
      };
    } catch (error: any) {
      console.error('validateAddress tool error:', error);
      return {
        success: false,
        address,
        isValidFormat: viemIsAddress(address),
        error: error.message || 'Failed to validate address',
      };
    }
  },
});

/**
 * All available tools for the Civitas AI agent
 */
export const civitasTools = {
  resolveENS,
  checkBalance,
  validateAddress,
};
