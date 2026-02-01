'use client';

import type { RentalConfig } from '@/lib/ai/schemas';
import { formatUnits } from 'viem';

interface ContractCardProps {
  config: Partial<RentalConfig>;
  isComplete: boolean;
}

export function ContractCard({ config, isComplete }: ContractCardProps) {
  const totalAmount = config.monthlyAmount && config.totalMonths
    ? config.monthlyAmount * config.totalMonths
    : 0;

  return (
    <div className="bg-white border border-zinc-200 rounded-lg p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-zinc-900">Rental Agreement</h3>
        <p className="text-sm text-zinc-500 mt-1">
          {isComplete ? 'Ready to deploy' : 'Configure details via chat'}
        </p>
      </div>

      <div className="space-y-4">
        {/* Tenant */}
        <div>
          <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
            Tenant
          </label>
          <p className="mt-1 text-sm text-zinc-900 font-mono">
            {config.tenant || '—'}
          </p>
        </div>

        {/* Monthly Amount */}
        <div>
          <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
            Monthly Amount
          </label>
          <p className="mt-1 text-sm text-zinc-900">
            {config.monthlyAmount
              ? `${config.monthlyAmount.toLocaleString()} USDC`
              : '—'}
          </p>
        </div>

        {/* Duration */}
        <div>
          <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
            Duration
          </label>
          <p className="mt-1 text-sm text-zinc-900">
            {config.totalMonths
              ? `${config.totalMonths} month${config.totalMonths > 1 ? 's' : ''}`
              : '—'}
          </p>
        </div>

        {/* Total Amount */}
        <div className="pt-4 border-t border-zinc-200">
          <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
            Total Amount
          </label>
          <p className="mt-1 text-lg font-semibold text-zinc-900">
            {totalAmount > 0 ? `${totalAmount.toLocaleString()} USDC` : '—'}
          </p>
        </div>
      </div>

      {/* Deploy Button */}
      {isComplete && (
        <button
          className="mt-6 w-full px-4 py-3 bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-800 transition-colors"
        >
          Sign & Fund
        </button>
      )}

      {!isComplete && (
        <div className="mt-6 p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
          <p className="text-xs text-zinc-600 text-center">
            Complete all fields to deploy your agreement
          </p>
        </div>
      )}
    </div>
  );
}
