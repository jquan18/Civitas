'use client';

import { formatUnits } from 'viem';
import type { RentalContract } from '@/lib/contracts/fetch-contracts';
import { ContractState } from '@/lib/contracts/fetch-contracts';
import HardShadowCard from '@/components/ui/HardShadowCard';

interface DashboardContractCardProps {
  contract: RentalContract;
  onClick?: () => void;
}

const STATE_LABELS: Record<ContractState, { label: string; bgColor: string; textColor: string }> = {
  [ContractState.Deployed]: { label: 'Ghost', bgColor: 'bg-gray-400', textColor: 'text-black' },
  [ContractState.Active]: { label: 'Active', bgColor: 'bg-acid-lime', textColor: 'text-black' },
  [ContractState.Completed]: { label: 'Completed', bgColor: 'bg-green-500', textColor: 'text-white' },
  [ContractState.TerminationPending]: { label: 'Terminating', bgColor: 'bg-purple-500', textColor: 'text-white' },
  [ContractState.Terminated]: { label: 'Terminated', bgColor: 'bg-red-500', textColor: 'text-white' },
};

export function DashboardContractCard({ contract, onClick }: DashboardContractCardProps) {
  const stateInfo = STATE_LABELS[contract.state];
  const monthlyAmount = formatUnits(contract.monthlyAmount, 6);
  const totalAmount = formatUnits(contract.monthlyAmount * BigInt(contract.totalMonths), 6);
  const paidAmount = formatUnits(contract.totalPaid, 6);

  // Calculate progress percentage
  const totalRequired = contract.monthlyAmount * BigInt(contract.totalMonths);
  const progressPercent = totalRequired > 0n
    ? Number((contract.totalPaid * 100n) / totalRequired)
    : 0;

  return (
    <HardShadowCard hoverable onClick={onClick} className="p-6 cursor-pointer">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-display font-bold text-sm text-black">
            {contract.address.slice(0, 10)}...{contract.address.slice(-8)}
          </h3>
          <p className="font-display text-xs text-black mt-1">
            {contract.totalMonths} months • {monthlyAmount} USDC/mo
          </p>
        </div>
        <div className={`${stateInfo.bgColor} ${stateInfo.textColor} px-3 py-1 border-2 border-black`}>
          <span className="font-display font-bold text-xs uppercase">{stateInfo.label}</span>
        </div>
      </div>

      {/* Progress Bar */}
      {contract.state === ContractState.Active && (
        <div className="mb-4">
          <div className="flex justify-between font-display text-xs text-black mb-2 font-bold">
            <span>Paid: {paidAmount} USDC</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full bg-gray-200 h-3 border-2 border-black">
            <div
              className="bg-acid-lime h-full border-r-2 border-black transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Details */}
      <div className="space-y-2 font-display text-sm border-t-2 border-dashed border-black pt-4">
        <div className="flex justify-between">
          <span className="text-black font-bold">Tenant:</span>
          <span className="text-black font-mono text-xs">
            {contract.tenant.slice(0, 6)}...{contract.tenant.slice(-4)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-black font-bold">Total:</span>
          <span className="text-black font-bold">{totalAmount} USDC</span>
        </div>
      </div>
    </HardShadowCard>
  );
}
