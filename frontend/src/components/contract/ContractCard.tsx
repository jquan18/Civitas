'use client';

import type { RentalConfig } from '@/lib/ai/schemas';
import TornPaperCard from '@/components/ui/TornPaperCard';
import TactileButton from '@/components/ui/TactileButton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CheckCircle2 } from 'lucide-react';

interface ContractCardProps {
  config: Partial<RentalConfig>;
  isComplete: boolean;
}

export function ContractCard({ config, isComplete }: ContractCardProps) {
  const totalAmount = config.monthlyAmount && config.totalMonths
    ? config.monthlyAmount * config.totalMonths
    : 0;

  // Generate receipt ID (last 8 chars of a mock address for display)
  const receiptId = 'XXXXXXXX'.substring(0, 8);

  return (
    <TornPaperCard className="animate-receipt-print">
      {/* Receipt Header */}
      <div className="mb-6 text-center">
        <h2 className="font-headline text-3xl uppercase mb-2 text-black">RECEIPT</h2>
        <p className="font-display text-xs text-black opacity-60">ID: {receiptId}</p>
        <div className="mt-3 flex justify-center">
          <StatusBadge status={isComplete ? 'ready' : 'incomplete'} size="sm" />
        </div>
      </div>

      {/* Dashed Divider */}
      <div className="border-t-2 border-dashed border-black mb-6" />

      {/* Details Section */}
      <div className="space-y-4 mb-6">
        {/* Tenant */}
        <div className="flex justify-between items-start">
          <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">
            Tenant
          </label>
          <p className="text-sm font-bold text-black font-mono text-right max-w-[60%] break-all">
            {config.tenant || '—'}
          </p>
        </div>

        {/* Monthly Amount */}
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">
            Monthly Amount
          </label>
          <p className="text-sm font-bold text-black">
            {config.monthlyAmount
              ? `${config.monthlyAmount.toLocaleString()} USDC`
              : '—'}
          </p>
        </div>

        {/* Duration */}
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">
            Duration
          </label>
          <p className="text-sm font-bold text-black">
            {config.totalMonths
              ? `${config.totalMonths} month${config.totalMonths > 1 ? 's' : ''}`
              : '—'}
          </p>
        </div>
      </div>

      {/* Dashed Divider */}
      <div className="border-t-2 border-dashed border-black mb-6" />

      {/* Total Amount Highlight */}
      <div className="border-y-[3px] border-black bg-gray-50 -mx-8 px-8 py-4 mb-6">
        <div className="flex justify-between items-center">
          <span className="font-headline text-lg uppercase text-black">TOTAL</span>
          <div className="bg-black px-3 py-1 inline-block">
            <span className="text-hot-pink font-headline text-2xl">
              {totalAmount > 0 ? `${totalAmount.toLocaleString()}` : '—'}
            </span>
            <span className="text-white font-headline text-sm ml-2">USDC</span>
          </div>
        </div>
      </div>

      {/* Barcode */}
      <div className="mb-6 opacity-70">
        <svg width="100%" height="8" viewBox="0 0 200 8">
          {[...Array(40)].map((_, i) => (
            <rect
              key={i}
              x={i * 5}
              y="0"
              width={i % 3 === 0 ? '3' : '2'}
              height="8"
              fill="black"
            />
          ))}
        </svg>
      </div>

      {/* Action Button */}
      {isComplete && (
        <TactileButton variant="secondary" className="w-full">
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span>DEPLOY CONTRACT</span>
          </div>
        </TactileButton>
      )}

      {!isComplete && (
        <div className="p-4 bg-gray-100 border-[2px] border-black text-center">
          <p className="text-xs font-bold text-gray-600 uppercase">
            Complete all fields to deploy
          </p>
        </div>
      )}
    </TornPaperCard>
  );
}
