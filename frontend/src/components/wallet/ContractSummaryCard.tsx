'use client';

import Link from 'next/link';
import HardShadowCard from '@/components/ui/HardShadowCard';
import { ArrowRight } from 'lucide-react';

interface ContractSummaryCardProps {
  activeCount: number;
  totalLocked: string;
  isLoading: boolean;
}

export default function ContractSummaryCard({
  activeCount,
  totalLocked,
  isLoading,
}: ContractSummaryCardProps) {
  if (isLoading) {
    return (
      <HardShadowCard className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-32 mb-4"></div>
          <div className="h-8 bg-gray-300 rounded w-20 mb-2"></div>
          <div className="h-4 bg-gray-300 rounded w-24"></div>
        </div>
      </HardShadowCard>
    );
  }

  return (
    <HardShadowCard className="p-6">
      <div className="flex flex-col gap-4">
        <h3 className="font-headline text-xl uppercase">Active Contracts</h3>

        <div className="border-t-2 border-dashed border-black pt-4 space-y-3">
          {/* Active Count */}
          <div>
            <span className="font-display font-bold text-xs uppercase text-gray-600 block mb-1">
              Active Contracts
            </span>
            <div className="font-mono text-3xl font-bold">{activeCount}</div>
          </div>

          {/* Total Locked */}
          <div>
            <span className="font-display font-bold text-xs uppercase text-gray-600 block mb-1">
              Total Locked
            </span>
            <div className="font-mono text-xl font-bold">{totalLocked} USDC</div>
          </div>
        </div>

        {/* Link to Dashboard */}
        <Link
          href="/dashboard"
          className="w-full bg-acid-lime text-black border-2 border-black px-4 py-3 font-display font-bold uppercase shadow-[4px_4px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>View Dashboard</span>
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    </HardShadowCard>
  );
}
