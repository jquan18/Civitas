'use client';

import * as React from 'react';
import { formatUnits } from 'viem';
import { useWriteContract, useReadContract } from 'wagmi';
import type { AllContracts } from '@/app/dashboard/page';
import TornPaperCard from '@/components/ui/TornPaperCard';
import TactileButton from '@/components/ui/TactileButton';
import { Gift, AlertCircle } from 'lucide-react';
import { STABLE_ALLOWANCE_TREASURY_ABI } from '@/lib/contracts/abis';

interface RecipientViewProps {
  contract: AllContracts;
  userAddress: `0x${string}`;
  onSync?: () => void;
}

export default function RecipientView({ contract, userAddress, onSync }: RecipientViewProps) {
  const contractAddress = contract.contract_address as `0x${string}`;

  // Read treasury status
  const { data: treasuryStatus, refetch, isLoading, isError } = useReadContract({
    address: contractAddress,
    abi: STABLE_ALLOWANCE_TREASURY_ABI,
    functionName: 'getTreasuryStatus',
  });

  const { writeContract: claim, isSuccess: isClaimSuccess } = useWriteContract();

  // Debug: Log the treasury status
  React.useEffect(() => {
    console.log('📊 RecipientView - Treasury Status:', {
      contractAddress,
      treasuryStatus,
      isLoading,
      isError,
      parsed: {
        owner: treasuryStatus?.[0],
        recipient: treasuryStatus?.[1],
        allowancePerIncrement: treasuryStatus?.[2]?.toString(),
        approvalCounter: treasuryStatus?.[3]?.toString(),
        claimedCount: treasuryStatus?.[4]?.toString(),
        unclaimed: treasuryStatus?.[5]?.toString(),
        balance: treasuryStatus?.[6]?.toString(),
        state: treasuryStatus?.[7]?.toString(),
      }
    });
  }, [treasuryStatus, contractAddress, isLoading, isError]);

  // Auto-sync after successful claim
  React.useEffect(() => {
    if (isClaimSuccess) {
      setTimeout(() => {
        onSync?.();
      }, 2000); // Wait 2 seconds for blockchain confirmation
    }
  }, [isClaimSuccess, onSync]);

  // Parse treasury status
  const allowancePerIncrement = treasuryStatus?.[2] ? BigInt(treasuryStatus[2]) : 0n;
  const approvalCounter = treasuryStatus?.[3] ? Number(treasuryStatus[3]) : 0;
  const claimedCount = treasuryStatus?.[4] ? Number(treasuryStatus[4]) : 0;
  const unclaimed = treasuryStatus?.[5] ? Number(treasuryStatus[5]) : 0;
  const balance = treasuryStatus?.[6] ? BigInt(treasuryStatus[6]) : 0n;
  const state = treasuryStatus?.[7] !== undefined ? Number(treasuryStatus[7]) : 0;

  // State labels
  const stateLabels = ['Active', 'Paused', 'Terminated'];
  const stateColors = ['bg-acid-lime', 'bg-warning-yellow', 'bg-red-500'];
  const currentStateLabel = stateLabels[state] || 'Unknown';
  const currentStateColor = stateColors[state] || 'bg-gray-400';

  // Calculate totals
  const totalAvailable = allowancePerIncrement * BigInt(unclaimed);
  const totalClaimed = allowancePerIncrement * BigInt(claimedCount);

  // Determine if can claim
  const canClaim = state === 0 && unclaimed > 0 && balance >= allowancePerIncrement;

  // Handle claim
  const handleClaim = () => {
    claim({
      address: contractAddress,
      abi: STABLE_ALLOWANCE_TREASURY_ABI,
      functionName: 'claim',
    });
  };

  return (
    <div className="w-full md:flex-1 bg-paper-cream h-full flex flex-col relative overflow-hidden">
      {/* Pattern Grid Background */}
      <div className="absolute inset-0 pattern-grid pointer-events-none z-0"></div>

      {/* Fixed Header (outside scroll area) */}
      <div className="relative z-10 p-4 md:p-6 shrink-0 flex justify-between items-center">
        <h2 className="font-headline text-2xl uppercase tracking-tighter bg-stark-white px-3 py-1 border-2 border-black shadow-[4px_4px_0px_#000] inline-block">
          Execution Zone
        </h2>

        {/* Debug Refresh Button */}
        <button
          onClick={() => refetch()}
          className="px-3 py-1 border-2 border-black bg-warning-yellow font-bold text-xs hover:bg-yellow-300"
        >
          🔄 Force Refresh
        </button>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center">
        {/* Recipient Card */}
        <div className="w-full max-w-md relative z-10 mb-8">
          <TornPaperCard className={`${canClaim ? 'ring-4 ring-acid-lime ring-offset-4 animate-pulse' : ''}`}>
          <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-black border-dashed pb-4">
              <div>
                <h3 className="font-headline text-3xl uppercase leading-none mb-2">Your Allowance</h3>
                <span className="bg-acid-lime text-void-black font-bold px-2 py-1 text-xs uppercase inline-block border-2 border-black">
                  RECIPIENT
                </span>
              </div>
              <div className="text-right">
                <div className={`${currentStateColor} text-black font-bold px-3 py-1 text-xs uppercase inline-block border-2 border-black`}>
                  {currentStateLabel}
                </div>
              </div>
            </div>

            {/* Main Display - Unclaimed */}
            <div className="text-center py-6 border-2 border-black bg-gray-50">
              <p className="text-xs uppercase font-bold text-gray-600 mb-2">Unclaimed Allowances</p>
              <p className="font-headline text-6xl mb-2">{unclaimed}</p>
              {unclaimed > 0 && (
                <p className="text-sm font-bold text-gray-700">
                  = {formatUnits(totalAvailable, 6)} USDC
                </p>
              )}
            </div>

            {/* Details */}
            <div className="space-y-4 font-display">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 uppercase text-sm font-bold">Allowance Amount</span>
                <span className="font-bold text-xl">{formatUnits(allowancePerIncrement, 6)} USDC</span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t-2 border-dashed border-black">
                <span className="text-gray-600 uppercase text-sm font-bold">Total Claimed</span>
                <span className="font-bold">{claimedCount} claims</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600 uppercase text-sm font-bold">Lifetime Received</span>
                <span className="font-bold">{formatUnits(totalClaimed, 6)} USDC</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600 uppercase text-sm font-bold">Treasury Balance</span>
                <span className="font-bold">{formatUnits(balance, 6)} USDC</span>
              </div>

              {/* Status Messages */}
              {canClaim && (
                <div className="bg-green-100 border-2 border-green-500 p-3 text-center">
                  <p className="font-bold text-green-700 text-sm">
                    ✓ {unclaimed} allowance{unclaimed !== 1 ? 's' : ''} ready to claim!
                  </p>
                </div>
              )}

              {state === 1 && (
                <div className="bg-yellow-100 border-2 border-yellow-500 p-3 text-center">
                  <p className="font-bold text-yellow-700 text-sm">Treasury Paused by Owner</p>
                </div>
              )}

              {state === 2 && (
                <div className="bg-red-100 border-2 border-red-500 p-3 text-center">
                  <p className="font-bold text-red-700 text-sm">Treasury Terminated</p>
                </div>
              )}

              {state === 0 && unclaimed === 0 && (
                <div className="bg-gray-100 border-2 border-gray-400 p-3 text-center">
                  <p className="font-bold text-gray-700 text-sm">Waiting for Owner to Approve</p>
                </div>
              )}

              {state === 0 && unclaimed > 0 && balance < allowancePerIncrement && (
                <div className="bg-yellow-100 border-2 border-yellow-500 p-3 text-center flex items-center justify-center gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-700" />
                  <p className="font-bold text-yellow-700 text-sm">Treasury Needs Funding</p>
                </div>
              )}
            </div>

            {/* Claim History Preview */}
            {claimedCount > 0 && (
              <div className="pt-4 border-t-2 border-dashed border-black">
                <h4 className="font-bold text-xs uppercase mb-2 text-gray-600">Recent Claims</h4>
                <div className="space-y-1">
                  {Array.from({ length: Math.min(claimedCount, 3) }).map((_, i) => (
                    <div key={i} className="flex justify-between text-xs border-b border-gray-200 pb-1">
                      <span>Claim #{claimedCount - i}</span>
                      <span className="font-bold">{formatUnits(allowancePerIncrement, 6)} USDC</span>
                    </div>
                  ))}
                </div>
                {claimedCount > 3 && (
                  <p className="text-xs text-gray-500 text-center mt-2">
                    + {claimedCount - 3} more
                  </p>
                )}
              </div>
            )}
          </div>
        </TornPaperCard>
      </div>

      {/* Claim Button */}
      {canClaim ? (
        <TactileButton
          variant="primary"
          className="w-full max-w-md group relative z-10"
          onClick={handleClaim}
        >
          <div className="p-2 flex items-center justify-center gap-4">
            <span className="font-headline text-4xl text-void-black uppercase tracking-widest">
              Claim Allowance
            </span>
            <Gift className="w-12 h-12 text-void-black group-hover:rotate-12 transition-transform" />
          </div>
        </TactileButton>
      ) : (
        <div className="w-full max-w-md relative z-10">
          <div className="bg-stark-white border-4 border-black shadow-[8px_8px_0px_#000] p-6 text-center">
            <p className="font-display font-bold text-gray-600">
              {state !== 0 && `Treasury ${currentStateLabel}`}
              {state === 0 && unclaimed === 0 && 'No Unclaimed Allowances'}
              {state === 0 && unclaimed > 0 && balance < allowancePerIncrement && 'Insufficient Treasury Balance'}
            </p>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
