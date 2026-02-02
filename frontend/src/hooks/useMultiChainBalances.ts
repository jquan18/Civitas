'use client';

import { useBalance, useBlockNumber } from 'wagmi';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface ChainBalances {
  eth: ReturnType<typeof useBalance>;
  usdc: ReturnType<typeof useBalance>;
}

export function useMultiChainBalances(address: `0x${string}` | undefined) {
  const queryClient = useQueryClient();

  // Base chain balances
  const baseEth = useBalance({
    address,
    chainId: 8453, // Base mainnet
  });

  const baseUsdc = useBalance({
    address,
    chainId: 8453,
    token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base USDC
  });

  // Ethereum mainnet balance
  const ethMainnetEth = useBalance({
    address,
    chainId: 1, // Ethereum mainnet
  });

  const ethMainnetUsdc = useBalance({
    address,
    chainId: 1,
    token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Ethereum USDC
  });

  // Auto-refresh on new blocks (Base chain)
  const { data: blockNumber } = useBlockNumber({
    chainId: 8453,
    watch: true
  });

  useEffect(() => {
    if (blockNumber) {
      queryClient.invalidateQueries({ queryKey: baseEth.queryKey });
      queryClient.invalidateQueries({ queryKey: baseUsdc.queryKey });
    }
  }, [blockNumber, queryClient, baseEth.queryKey, baseUsdc.queryKey]);

  const isLoading = baseEth.isLoading || baseUsdc.isLoading || ethMainnetEth.isLoading || ethMainnetUsdc.isLoading;
  const hasError = baseEth.isError || baseUsdc.isError || ethMainnetEth.isError || ethMainnetUsdc.isError;

  return {
    base: {
      eth: baseEth,
      usdc: baseUsdc,
    },
    ethereum: {
      eth: ethMainnetEth,
      usdc: ethMainnetUsdc,
    },
    isLoading,
    hasError,
  };
}
