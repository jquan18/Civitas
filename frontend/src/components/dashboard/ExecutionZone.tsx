'use client';

import { formatUnits } from 'viem';
import type { RentalContract } from '@/lib/contracts/fetch-contracts';
import { ContractState } from '@/lib/contracts/fetch-contracts';
import TornPaperCard from '@/components/ui/TornPaperCard';
import TactileButton from '@/components/ui/TactileButton';
import { CheckCircle2 } from 'lucide-react';

interface ExecutionZoneProps {
  contract: RentalContract | null;
}

const STATE_LABELS: Record<ContractState, { label: string; bgColor: string }> = {
  [ContractState.Deployed]: { label: 'Ghost', bgColor: 'bg-gray-400' },
  [ContractState.Active]: { label: 'Active', bgColor: 'bg-acid-lime' },
  [ContractState.Completed]: { label: 'Completed', bgColor: 'bg-green-500' },
  [ContractState.TerminationPending]: { label: 'Terminating', bgColor: 'bg-purple-500' },
  [ContractState.Terminated]: { label: 'Terminated', bgColor: 'bg-red-500' },
};

export default function ExecutionZone({ contract }: ExecutionZoneProps) {
  if (!contract) {
    return (
      <div className="w-full md:flex-1 bg-paper-cream h-full flex flex-col items-center justify-center p-8 relative overflow-y-auto">
        <div className="absolute inset-0 pattern-grid pointer-events-none z-0"></div>
        <div className="relative z-10">
          <div className="bg-stark-white border-4 border-black shadow-[8px_8px_0px_#000] p-12 text-center">
            <h2 className="font-headline text-2xl uppercase mb-4">Execution Zone</h2>
            <p className="font-display font-bold text-black">
              SELECT A CONTRACT TO VIEW DETAILS
            </p>
          </div>
        </div>
      </div>
    );
  }

  const stateInfo = STATE_LABELS[contract.state];
  const monthlyAmount = formatUnits(contract.monthlyAmount, 6);
  const totalAmount = formatUnits(contract.monthlyAmount * BigInt(contract.totalMonths), 6);
  const paidAmount = formatUnits(contract.totalPaid, 6);

  return (
    <div className="w-full md:flex-1 bg-paper-cream h-full flex flex-col items-center justify-center p-8 relative overflow-y-auto">
      <div className="absolute inset-0 pattern-grid pointer-events-none z-0"></div>

      <h2 className="font-headline text-2xl uppercase tracking-tighter absolute top-4 left-4 md:left-8 z-10 bg-stark-white px-3 py-1 border-2 border-black shadow-[4px_4px_0px_#000]">
        Execution Zone
      </h2>

      {/* Receipt Card */}
      <div className="w-full max-w-md relative z-10 mb-8 animate-receipt-print">
        <TornPaperCard className="transform -rotate-1">
          <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-black border-dashed pb-6">
              <div>
                <h3 className="font-headline text-3xl uppercase leading-none mb-1">Receipt</h3>
                <span className="font-display text-xs text-gray-500">
                  ID: #{contract.address.slice(-8).toUpperCase()}
                </span>
              </div>
              <div className="text-right">
                <div className={`${stateInfo.bgColor} text-black font-bold px-3 py-1 text-xs uppercase inline-block mb-1 border-2 border-black`}>
                  {stateInfo.label}
                </div>
                <div className="text-xs font-display font-bold">GAS: 15 GWEI</div>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-4 font-display">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 uppercase text-sm font-bold">Contract</span>
                <span className="font-bold font-mono text-xs">
                  {contract.address.slice(0, 10)}...{contract.address.slice(-8)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 uppercase text-sm font-bold">Tenant</span>
                <span className="font-bold font-mono text-xs">
                  {contract.tenant.slice(0, 6)}...{contract.tenant.slice(-4)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 uppercase text-sm font-bold">Term</span>
                <span className="font-bold">{contract.totalMonths} Months</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 uppercase text-sm font-bold">Monthly</span>
                <span className="font-bold">{monthlyAmount} USDC</span>
              </div>

              {/* Amount Section */}
              <div className="my-4 border-y-2 border-black py-4 bg-gray-50 -mx-8 px-8">
                <div className="flex justify-between items-center mb-1">
                  <span className="uppercase text-sm font-bold">Paid</span>
                  <span className="font-headline text-xl">{paidAmount} USDC</span>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span>Total Required</span>
                  <span>{totalAmount} USDC</span>
                </div>
              </div>

              <div className="flex justify-between items-end">
                <span className="font-headline text-xl uppercase">Total</span>
                <span className="font-headline text-2xl text-hot-pink bg-void-black px-2 text-stark-white border-2 border-black">
                  {totalAmount} USDC
                </span>
              </div>
            </div>

            {/* Barcode */}
            <div className="mt-4 pt-4 border-t-2 border-dashed border-black opacity-70">
              <svg className="h-8 w-full" preserveAspectRatio="none" viewBox="0 0 300 40">
                <path
                  d="M0 0h4v40H0V0zm6 0h2v40H6V0zm6 0h6v40h-6V0zm10 0h2v40h-2V0zm6 0h4v40h-4V0zm10 0h2v40h-2V0zm4 0h6v40h-6V0zm10 0h2v40h-2V0zm4 0h4v40h-4V0zm8 0h2v40h-2V0zm6 0h2v40h-2V0zm6 0h4v40h-4V0zm8 0h6v40h-6V0zm8 0h2v40h-2V0zm4 0h6v40h-6V0zm8 0h2v40h-2V0zm6 0h4v40h-4V0zm8 0h2v40h-2V0zm6 0h2v40h-2V0zm4 0h6v40h-6V0zm8 0h2v40h-2V0zm6 0h4v40h-4V0zm8 0h2v40h-2V0zm6 0h2v40h-2V0zm4 0h6v40h-6V0z"
                  fill="#000"
                ></path>
              </svg>
            </div>
          </div>
        </TornPaperCard>
      </div>

      {/* Confirm Button */}
      <TactileButton
        variant="secondary"
        className="w-full max-w-md group relative z-10"
      >
        <div className="p-2 flex items-center justify-center gap-4">
          <span className="font-headline text-4xl text-stark-white uppercase tracking-widest drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">
            View Details
          </span>
          <CheckCircle2 className="w-12 h-12 text-stark-white drop-shadow-[2px_2px_0px_rgba(0,0,0,1)] group-hover:rotate-12 transition-transform" />
        </div>
      </TactileButton>
    </div>
  );
}
