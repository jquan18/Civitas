'use client';

import HardShadowCard from '@/components/ui/HardShadowCard';
import { formatUnits } from 'viem';

interface BalanceCardProps {
  token: 'ETH' | 'USDC';
  balance: bigint | undefined;
  decimals: number;
  usdValue?: string;
  chainName: string;
  isLoading: boolean;
  isError: boolean;
  error?: Error | null;
}

export default function BalanceCard({
  token,
  balance,
  decimals,
  usdValue,
  chainName,
  isLoading,
  isError,
  error,
}: BalanceCardProps) {
  const formatBalance = (bal: bigint | undefined) => {
    if (!bal) return '0.00';
    const formatted = formatUnits(bal, decimals);
    const num = parseFloat(formatted);
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
  };

  if (isLoading) {
    return (
      <HardShadowCard className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-20 mb-4"></div>
          <div className="h-12 bg-gray-300 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-300 rounded w-32"></div>
        </div>
      </HardShadowCard>
    );
  }

  if (isError) {
    return (
      <HardShadowCard className="p-6 border-red-500">
        <div className="flex flex-col gap-2">
          <span className="font-display font-bold text-xs uppercase text-red-600">
            {token} on {chainName}
          </span>
          <p className="text-sm text-red-600">
            Error: {error?.message || 'Failed to load balance'}
          </p>
        </div>
      </HardShadowCard>
    );
  }

  return (
    <HardShadowCard className="p-6">
      <div className="flex flex-col gap-2">
        {/* Token Label */}
        <span className="font-display font-bold text-xs uppercase text-gray-600">
          {token} on {chainName}
        </span>

        {/* Balance Amount */}
        <div className="font-mono text-3xl md:text-4xl font-bold">
          {formatBalance(balance)} {token}
        </div>

        {/* USD Value */}
        {usdValue && (
          <div className="text-sm md:text-base text-gray-600 font-display">
            ≈ ${usdValue} USD
          </div>
        )}
      </div>
    </HardShadowCard>
  );
}
