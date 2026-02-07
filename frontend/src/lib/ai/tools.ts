import { tool } from 'ai';
import { z } from 'zod';
import { createPublicClient, http, isAddress as viemIsAddress, formatUnits, parseUnits } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { USDC_ADDRESS, USDC_DECIMALS } from '@/lib/contracts/constants';
import { isENSName, isAddress, formatAddress } from '@/lib/ens/resolver';
import {
  scanWalletBalances as scanWalletBalancesLogic,
  getOptimalFundingRoutes as getOptimalFundingRoutesLogic,
  CHAIN_TOKENS,
  ERC20_ABI
} from '@/lib/funding/routing';

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
 * Scan wallet balances across multiple chains to find funding sources
 */
const scanWalletBalances = tool({
  description:
    'Scan a wallet address across multiple chains (Ethereum, Base, Arbitrum, Optimism, Polygon) to find ETH and USDC balances. ' +
    'Use this to help users find where they have funds to deploy or fund a contract.',
  inputSchema: z.object({
    address: z.string().describe('The wallet address to scan'),
  }),
  execute: async ({ address }) => {
    console.log(`[scanWalletBalances] Starting scan for address: ${address}`);

    if (!viemIsAddress(address)) {
      console.error(`[scanWalletBalances] Invalid address format: ${address}`);
      return { success: false, error: 'Invalid address format' };
    }

    const results = await Promise.all(
      CHAIN_TOKENS.map(async (chainConfig) => {
        try {
          console.log(`[scanWalletBalances] Checking chain: ${chainConfig.name} (${chainConfig.chain.id})`);
          const client = createPublicClient({
            chain: chainConfig.chain,
            transport: http(),
          });

          const balances = await Promise.all(
            chainConfig.tokens.map(async (token) => {
              try {
                let balance: bigint;
                if (token.address === '0x0000000000000000000000000000000000000000') {
                  balance = await client.getBalance({ address: address as `0x${string}` });
                } else {
                  balance = await client.readContract({
                    address: token.address as `0x${string}`,
                    abi: ERC20_ABI,
                    functionName: 'balanceOf',
                    args: [address as `0x${string}`],
                  });
                }

                const formatted = formatUnits(balance, token.decimals);
                console.log(`[scanWalletBalances] ${chainConfig.name} - ${token.symbol}: ${formatted} (Raw: ${balance})`);

                // Filter out dust (< 0.0001)
                if (parseFloat(formatted) < 0.0001) {
                  console.log(`[scanWalletBalances] Ignoring dust balance for ${token.symbol} on ${chainConfig.name}`);
                  return null;
                }

                return {
                  symbol: token.symbol,
                  tokenAddress: token.address,
                  amount: formatted,
                  amountRaw: balance.toString(),
                  decimals: token.decimals,
                };
              } catch (e: any) {
                console.error(`[scanWalletBalances] Error fetching ${token.symbol} on ${chainConfig.name}:`, e.message);
                return null;
              }
            })
          );

          const activeBalances = balances.filter((b) => b !== null);

          if (activeBalances.length === 0) return null;

          return {
            chainId: chainConfig.chain.id,
            chainName: chainConfig.name,
            balances: activeBalances,
          };
        } catch (e: any) {
          console.error(`[scanWalletBalances] Failed to scan chain ${chainConfig.name}:`, e.message);
          return null;
        }
      })
    );

    const foundFunds = results.filter((r) => r !== null);
    console.log(`[scanWalletBalances] Scan complete. Found funds on ${foundFunds.length} chains.`);

    return {
      success: true,
      address,
      balances: foundFunds,
      totalChainsFound: foundFunds.length,
    };
  },
});

/**
 * Get optimal funding route via LI.FI
 */
const getOptimalFundingRoute = tool({
  description:
    'Calculate and compare optimal routes to bridge funds to Base from multiple potential source tokens/chains. ' +
    'Returns a ranked list of routes with fees, estimated time, and gas costs. ' +
    'If destinationAddress is not provided, defaults to bridging to the user\'s wallet.',
  inputSchema: z.object({
    walletAddress: z.string().describe('User wallet address'),
    destinationAddress: z.string().optional().describe('The destination address on Base (contract or wallet). Defaults to walletAddress if not provided.'),
    amount: z.string().describe('Required amount in USDC (e.g. "1200" or "1")'),
    candidateTokens: z
      .array(
        z.object({
          chainId: z.number(),
          tokenAddress: z.string(),
          symbol: z.string(),
          balance: z.string().optional().describe('Available balance of this token (e.g. "0.99"). Pass this from scanWalletBalances results.'),
        })
      )
      .max(10)
      .describe('List of tokens to compare (from scanWalletBalances results). Include balance so routes use actual available amounts.'),
  }),
  execute: async ({ walletAddress, destinationAddress, amount, candidateTokens }) => {
    // Default destination to wallet if not provided
    const destination = destinationAddress || walletAddress;

    console.log('[getOptimalFundingRoute] Starting route calculation:', {
      walletAddress,
      destinationAddress,
      destination,
      amount,
      candidateCount: candidateTokens.length,
    });

    try {
      const routes = await Promise.all(
        candidateTokens.map(async (candidate) => {
          try {
            // Find token decimals to convert amount to raw
            const chainConfig = CHAIN_TOKENS.find((c) => c.chain.id === candidate.chainId);
            const tokenConfig = chainConfig?.tokens.find(
              (t) => t.address.toLowerCase() === candidate.tokenAddress.toLowerCase()
            );

            // Default to 6 decimals (USDC) if not found, or 18 for ETH
            const decimals = tokenConfig?.decimals || (candidate.symbol === 'ETH' ? 18 : 6);

            // For quote, we want to know how much of Source Token is needed to get X USDC on Base.
            // But LI.FI /quote endpoint usually takes fromAmount.

            // SIMPLIFICATION for Hackathon:
            // Just use 10 USDC / 0.01 ETH for the quote to get the GAS ESTIMATE and TIME.
            // The specific amount matters less for route selection than gas/time.
            // But LI.FI might reject if amount is too low for bridge.

            // If token is stable (USDC, USDT), fromAmount = amount.
            // If token is ETH/MATIC, we need price.
            // Let's assume 1 ETH for the quote if symbol is ETH/MATIC, and `amount` if stable.

            // Use the lesser of requested amount and available balance
            let effectiveAmount = amount;
            if (candidate.balance) {
              const available = parseFloat(candidate.balance);
              const requested = parseFloat(amount);
              if (available < requested) {
                effectiveAmount = candidate.balance;
              }
            }

            let amountForQuote = parseUnits(effectiveAmount, decimals).toString();
            if (candidate.symbol === 'ETH' || candidate.symbol === 'MATIC') {
              // For native tokens, use actual balance or a small amount for the quote
              const ethAmount = candidate.balance && parseFloat(candidate.balance) > 0
                ? candidate.balance
                : '0.1';
              amountForQuote = parseUnits(ethAmount, decimals).toString();
            }

            const response = await fetch(`https://li.quest/v1/quote?${new URLSearchParams({
              fromChain: candidate.chainId.toString(),
              toChain: base.id.toString(),
              fromToken: candidate.tokenAddress,
              toToken: USDC_ADDRESS[base.id],
              fromAmount: amountForQuote,
              fromAddress: walletAddress,
              toAddress: destination,
            })}`);

            if (!response.ok) return null;
            const data = await response.json();

            return {
              sourceChainId: candidate.chainId,
              sourceToken: candidate.symbol,
              sourceTokenAddress: candidate.tokenAddress,
              gasCostUsd: data.estimate.gasCosts?.[0]?.amountUSD || '0',
              executionDuration: data.estimate.executionDuration,
              tool: data.tool,
              steps: data.includedSteps?.length || 1,
              action: data.action
            };

          } catch (e) {
            return null;
          }
        })
      );

      const validRoutes = routes.filter((r): r is NonNullable<typeof r> => r !== null);

      // Sort by gas cost (cheapest first)
      validRoutes.sort((a, b) => parseFloat(a.gasCostUsd) - parseFloat(b.gasCostUsd));

      if (validRoutes.length === 0) {
        console.log('[getOptimalFundingRoute] No valid routes found');
        return { success: false, error: 'No valid routes found via LI.FI' };
      }

      console.log('[getOptimalFundingRoute] Found routes:', {
        count: validRoutes.length,
        bestRoute: validRoutes[0],
      });

      return {
        success: true,
        routes: validRoutes,
        recommendation: {
          bestRoute: validRoutes[0],
          reason: `Cheapest option: $${parseFloat(validRoutes[0].gasCostUsd).toFixed(2)} gas fee via ${validRoutes[0].tool}`
        }
      };
    } catch (e: any) {
      return { success: false, error: e.message };
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
  scanWalletBalances,
  getOptimalFundingRoute,
};
