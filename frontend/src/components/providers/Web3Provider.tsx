'use client';

import { RainbowKitProvider, connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet,
  rainbowWallet,
  baseAccount,
} from '@rainbow-me/rainbowkit/wallets';
import { WagmiProvider, createConfig } from 'wagmi';
import { base, baseSepolia, mainnet, arbitrum, optimism, polygon } from 'wagmi/chains';
import { http } from 'viem';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import '@rainbow-me/rainbowkit/styles.css';

// Custom RPC URLs - these MUST be defined before config creation
const BASE_MAINNET_RPC = process.env.NEXT_PUBLIC_BASE_MAINNET_RPC_URL || 'https://mainnet.base.org';
const BASE_SEPOLIA_RPC = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '78531232796f972267f68a343b2f0a51';

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Popular',
      wallets: [
        baseAccount,
        coinbaseWallet,
        metaMaskWallet,
        rainbowWallet,
      ],
    },
    {
      groupName: 'Other',
      wallets: [
        walletConnectWallet,
      ],
    },
  ],
  {
    appName: 'Civitas',
    projectId,
  },
);

// Create wagmi config with explicit wallet connectors from RainbowKit
// and custom RPC transports for Base chains
const config = createConfig({
  chains: [base, baseSepolia, mainnet, arbitrum, optimism, polygon],
  connectors,
  transports: {
    [base.id]: http(BASE_MAINNET_RPC, {
      batch: false,
      timeout: 30000,
    }),
    [baseSepolia.id]: http(BASE_SEPOLIA_RPC, {
      batch: false,
      timeout: 30000,
    }),
    [mainnet.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [polygon.id]: http(),
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
