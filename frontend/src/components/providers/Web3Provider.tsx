'use client';

import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider, createConfig } from 'wagmi';
import { base, baseSepolia, arbitrum, optimism } from 'wagmi/chains';
import { http } from 'viem';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { injected, walletConnect } from 'wagmi/connectors';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import '@rainbow-me/rainbowkit/styles.css';

// Custom RPC URLs - these MUST be defined before config creation
const BASE_MAINNET_RPC = process.env.NEXT_PUBLIC_BASE_MAINNET_RPC_URL || 'https://mainnet.base.org';
const BASE_SEPOLIA_RPC = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';

console.log('========================================');
console.log('🔍 WEB3 PROVIDER RPC CONFIGURATION');
console.log('========================================');
console.log('Base Mainnet RPC:', BASE_MAINNET_RPC);
console.log('Base Sepolia RPC:', BASE_SEPOLIA_RPC);
console.log('');
console.log('🚨 IMPORTANT: If Mainnet RPC is NOT Alchemy, restart dev server!');
console.log('   Expected: https://base-mainnet.g.alchemy.com/v2/...');
console.log('   Actual:  ', BASE_MAINNET_RPC);
console.log('========================================');

// Create wagmi config manually (NOT using getDefaultConfig)
// This ensures our custom RPC transports are actually used
const config = createConfig({
  chains: [base, baseSepolia, arbitrum, optimism],
  connectors: [
    injected(),
    // Only include WalletConnect on client-side to avoid SSR errors
    ...(typeof window !== 'undefined'
      ? [
        walletConnect({
          projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '78531232796f972267f68a343b2f0a51',
        }),
      ]
      : []),
  ],
  transports: {
    [base.id]: http(BASE_MAINNET_RPC, {
      batch: false, // Disable batching for better reliability
      timeout: 30000, // 30 second timeout
    }),
    [baseSepolia.id]: http(BASE_SEPOLIA_RPC, {
      batch: false,
      timeout: 30000,
    }),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
  },
  ssr: true,
});

const queryClient = new QueryClient();

function WalletAuthHandler({ children }: { children: React.ReactNode }) {
  useWalletAuth();
  return <>{children}</>;
}

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <WalletAuthHandler>{children}</WalletAuthHandler>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
