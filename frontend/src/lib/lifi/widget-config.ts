import type { WidgetConfig } from '@lifi/widget';
import { LIFI_SUPPORTED_CHAIN_IDS, USDC_ADDRESSES } from './constants';

/**
 * Creates LI.FI Widget configuration
 *
 * IMPORTANT:
 * - LI.FI only supports MAINNET chains
 * - The `toAddress` parameter ensures funds go directly to the contract,
 *   NOT to the user's connected wallet
 */
export function createWidgetConfig({
  destinationAddress,
  amount,
}: {
  destinationAddress: `0x${string}`;
  amount: bigint; // USDC amount in 6 decimals
}): WidgetConfig {
  const chainId = LIFI_SUPPORTED_CHAIN_IDS.BASE_MAINNET;
  const usdcAddress = USDC_ADDRESSES[chainId];

  return {
    integrator: process.env.NEXT_PUBLIC_LIFI_INTEGRATOR || 'civitas',
    variant: 'compact',
    subvariant: 'split',

    // CRITICAL: Lock destination to CONTRACT address (not user wallet)
    // This ensures bridged funds go directly to the deployed contract
    toChain: chainId,
    toToken: usdcAddress,
    toAddress: destinationAddress as any, // Type assertion needed for LI.FI widget compatibility

    // Lock the amount to match contract requirements
    toAmount: amount.toString(),

    // Allow any source chain/token - user picks what they want to pay with
    fromChain: undefined,
    fromToken: undefined,

    // UI customization
    appearance: 'dark',
    theme: {
      palette: {
        primary: { main: '#3B82F6' },
        secondary: { main: '#10B981' },
      },
    },

    // Hide destination fields since they're locked
    hiddenUI: ['toAddress'],

    // Disable destination chain/token selection
    disabledUI: ['toToken'],

    // Build settings
    buildSwapUrl: true,
  } as WidgetConfig;
}
