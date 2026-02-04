'use client';

import { useState } from 'react';
import * as React from 'react';
import { formatUnits } from 'viem';
import { useWriteContract, useReadContract } from 'wagmi';
import type { AllContracts } from '@/app/dashboard/page';
import TornPaperCard from '@/components/ui/TornPaperCard';
import TactileButton from '@/components/ui/TactileButton';
import { DollarSign, RefreshCw, AlertTriangle } from 'lucide-react';
import { RENT_VAULT_ABI } from '@/lib/contracts/abis';

interface LandlordViewProps {
  contract: AllContracts;
  userAddress: `0x${string}`;
  onSync?: () => void;
}

export default function LandlordView({ contract, userAddress, onSync }: LandlordViewProps) {
  const [showRefundModal, setShowRefundModal] = useState(false);

  const config = contract.config || {};
  const contractAddress = contract.contract_address as `0x${string}`;
  const tenants = config.tenants || [];
  const shareBpsArray = config.shareBps || [];

  // Read contract data
  const { data: totalDeposited } = useReadContract({
    address: contractAddress,
    abi: RENT_VAULT_ABI,
    functionName: 'totalDeposited',
  });

  const { data: rentAmount } = useReadContract({
    address: contractAddress,
    abi: RENT_VAULT_ABI,
    functionName: 'rentAmount',
  });

  const { data: dueDate } = useReadContract({
    address: contractAddress,
    abi: RENT_VAULT_ABI,
    functionName: 'dueDate',
  });

  const { data: withdrawn } = useReadContract({
    address: contractAddress,
    abi: RENT_VAULT_ABI,
    functionName: 'withdrawn',
  });

  const { writeContract: withdrawToRecipient, isSuccess: isWithdrawSuccess } = useWriteContract();
  const { writeContract: refundAll, isSuccess: isRefundSuccess } = useWriteContract();

  // Auto-sync after successful transactions
  React.useEffect(() => {
    if (isWithdrawSuccess || isRefundSuccess) {
      setTimeout(() => {
        onSync?.();
      }, 2000); // Wait 2 seconds for blockchain confirmation
    }
  }, [isWithdrawSuccess, isRefundSuccess, onSync]);

  // Calculate progress
  const totalRent = rentAmount ? BigInt(rentAmount) : 0n;
  const totalDepositedAmount = totalDeposited ? BigInt(totalDeposited) : 0n;
  const progress = totalRent > 0n ? Number((totalDepositedAmount * 10000n) / totalRent) / 100 : 0;

  const isFullyFunded = totalDepositedAmount >= totalRent;
  const isWithdrawn = withdrawn || false;
  const canWithdraw = isFullyFunded && !isWithdrawn;
  const canRefund = totalDepositedAmount > 0n && !isWithdrawn;

  // Handle withdraw
  const handleWithdraw = () => {
    withdrawToRecipient({
      address: contractAddress,
      abi: RENT_VAULT_ABI,
      functionName: 'withdrawToRecipient',
    });
  };

  // Handle refund
  const handleRefund = () => {
    refundAll({
      address: contractAddress,
      abi: RENT_VAULT_ABI,
      functionName: 'refundAll',
      args: [tenants as `0x${string}`[]],
    });
    setShowRefundModal(false);
  };

  return (
    <div className="w-full md:flex-1 bg-paper-cream h-full flex flex-col relative overflow-hidden">
      {/* Pattern Grid Background */}
      <div className="absolute inset-0 pattern-grid pointer-events-none z-0"></div>

      {/* Fixed Header (outside scroll area) */}
      <div className="relative z-10 p-4 md:p-6 shrink-0">
        <h2 className="font-headline text-2xl uppercase tracking-tighter bg-stark-white px-3 py-1 border-2 border-black shadow-[4px_4px_0px_#000] inline-block">
          Execution Zone
        </h2>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center">
        {/* Landlord Card */}
        <div className="w-full max-w-md relative z-10 mb-8">
          <TornPaperCard className={`${canWithdraw ? 'ring-4 ring-acid-lime ring-offset-4' : ''}`}>
          <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-black border-dashed pb-4">
              <div>
                <h3 className="font-headline text-3xl uppercase leading-none mb-1">Rent Collection</h3>
                <span className="bg-acid-lime text-void-black font-bold px-2 py-1 text-xs uppercase inline-block border-2 border-black">
                  LANDLORD
                </span>
              </div>
              <div className="text-right">
                {isWithdrawn && (
                  <div className="bg-green-500 text-white font-bold px-3 py-1 text-xs uppercase inline-block border-2 border-black">
                    WITHDRAWN
                  </div>
                )}
                {!isWithdrawn && isFullyFunded && (
                  <div className="bg-acid-lime text-black font-bold px-3 py-1 text-xs uppercase inline-block border-2 border-black animate-pulse">
                    READY
                  </div>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="space-y-4 font-display">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 uppercase text-sm font-bold">Total Rent</span>
                <span className="font-bold text-xl">{formatUnits(totalRent, 6)} USDC</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600 uppercase text-sm font-bold">Total Deposited</span>
                <span className="font-bold text-xl">{formatUnits(totalDepositedAmount, 6)} USDC</span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-bold">Collection Progress</span>
                  <span className="font-bold">{progress.toFixed(1)}%</span>
                </div>
                <div className="h-6 bg-gray-200 border-2 border-black">
                  <div
                    className={`h-full transition-all duration-500 ${
                      isFullyFunded ? 'bg-acid-lime' : 'bg-warning-yellow'
                    }`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              </div>

              {/* Tenant Breakdown */}
              <div className="pt-2 border-t-2 border-dashed border-black">
                <h4 className="font-bold text-sm uppercase mb-2">Tenant Status</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {tenants.map((tenant: string, index: number) => {
                    const share = shareBpsArray[index] || 0;
                    const sharePercent = share / 100;
                    return (
                      <div key={tenant} className="flex justify-between items-center text-xs border-b border-gray-200 pb-1">
                        <span className="font-mono">{tenant.slice(0, 6)}...{tenant.slice(-4)}</span>
                        <span className="font-bold">{sharePercent}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Due Date */}
              {dueDate && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 uppercase text-sm font-bold">Due Date</span>
                  <span className="font-mono text-sm">
                    {new Date(Number(dueDate) * 1000).toLocaleDateString()}
                  </span>
                </div>
              )}

              {/* Status Messages */}
              {isFullyFunded && !isWithdrawn && (
                <div className="bg-green-100 border-2 border-green-500 p-3 text-center">
                  <p className="font-bold text-green-700 text-sm">✓ Fully Funded - You can withdraw!</p>
                </div>
              )}

              {!isFullyFunded && totalDepositedAmount > 0n && (
                <div className="bg-yellow-100 border-2 border-yellow-500 p-3 text-center">
                  <p className="font-bold text-yellow-700 text-sm">
                    Missing: {formatUnits(totalRent - totalDepositedAmount, 6)} USDC
                  </p>
                </div>
              )}

              {isWithdrawn && (
                <div className="bg-blue-100 border-2 border-blue-500 p-3 text-center">
                  <p className="font-bold text-blue-700 text-sm">✓ Funds Withdrawn Successfully</p>
                </div>
              )}
            </div>
          </div>
        </TornPaperCard>
      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-md space-y-4 relative z-10">
        {/* Withdraw Button */}
        {canWithdraw && (
          <TactileButton
            variant="primary"
            className="w-full group"
            onClick={handleWithdraw}
          >
            <div className="p-2 flex items-center justify-center gap-4">
              <span className="font-headline text-3xl text-void-black uppercase tracking-widest">
                Withdraw Full Rent
              </span>
              <DollarSign className="w-10 h-10 text-void-black group-hover:rotate-12 transition-transform" />
            </div>
          </TactileButton>
        )}

        {/* Refund Button */}
        {canRefund && !isFullyFunded && (
          <TactileButton
            variant="secondary"
            className="w-full group"
            onClick={() => setShowRefundModal(true)}
          >
            <div className="p-2 flex items-center justify-center gap-4">
              <span className="font-headline text-xl text-stark-white uppercase tracking-widest drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                Refund All Tenants
              </span>
              <RefreshCw className="w-8 h-8 text-stark-white drop-shadow-[2px_2px_0px_rgba(0,0,0,1)] group-hover:rotate-180 transition-transform" />
            </div>
          </TactileButton>
        )}
      </div>

      {/* Refund Confirmation Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-stark-white border-4 border-black shadow-[8px_8px_0px_#000] p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
              <h3 className="font-headline text-2xl uppercase">Confirm Refund</h3>
            </div>

            <div className="bg-red-50 border-2 border-red-500 p-4 mb-4">
              <p className="font-display font-bold text-red-700 text-sm">
                This will cancel the rent collection and refund all deposited funds to the tenants.
              </p>
            </div>

            <div className="space-y-2 mb-4 text-sm">
              <p><strong>Total to Refund:</strong> {formatUnits(totalDepositedAmount, 6)} USDC</p>
              <p><strong>Tenants:</strong> {tenants.length}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRefundModal(false)}
                className="flex-1 border-2 border-black px-4 py-2 font-bold hover:bg-gray-100"
              >
                Cancel
              </button>
              <TactileButton
                variant="secondary"
                className="flex-1"
                onClick={handleRefund}
              >
                <span className="font-bold text-stark-white drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                  Refund All
                </span>
              </TactileButton>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
