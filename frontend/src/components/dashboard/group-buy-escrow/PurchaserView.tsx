'use client';

import { useState } from 'react';
import * as React from 'react';
import { formatUnits } from 'viem';
import { useWriteContract, useReadContract } from 'wagmi';
import type { AllContracts } from '@/app/dashboard/page';
import TornPaperCard from '@/components/ui/TornPaperCard';
import TactileButton from '@/components/ui/TactileButton';
import { Package, Send, AlertCircle } from 'lucide-react';
import { GROUP_BUY_ESCROW_ABI } from '@/lib/contracts/abis';

interface PurchaserViewProps {
  contract: AllContracts;
  userAddress: `0x${string}`;
  onSync?: () => void;
}

export default function PurchaserView({ contract, userAddress, onSync }: PurchaserViewProps) {
  const [deliveryProofInput, setDeliveryProofInput] = useState('');
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);

  const contractAddress = contract.contract_address as `0x${string}`;

  // Read contract state
  const { data: fundingGoal } = useReadContract({
    address: contractAddress,
    abi: GROUP_BUY_ESCROW_ABI,
    functionName: 'fundingGoal',
  });

  const { data: totalDeposited } = useReadContract({
    address: contractAddress,
    abi: GROUP_BUY_ESCROW_ABI,
    functionName: 'totalDeposited',
  });

  const { data: goalReachedAt } = useReadContract({
    address: contractAddress,
    abi: GROUP_BUY_ESCROW_ABI,
    functionName: 'goalReachedAt',
  });

  const { data: deliveryConfirmedAt } = useReadContract({
    address: contractAddress,
    abi: GROUP_BUY_ESCROW_ABI,
    functionName: 'deliveryConfirmedAt',
  });

  const { data: deliveryProof } = useReadContract({
    address: contractAddress,
    abi: GROUP_BUY_ESCROW_ABI,
    functionName: 'deliveryProof',
  });

  const { data: released } = useReadContract({
    address: contractAddress,
    abi: GROUP_BUY_ESCROW_ABI,
    functionName: 'released',
  });

  const { data: yesVotes } = useReadContract({
    address: contractAddress,
    abi: GROUP_BUY_ESCROW_ABI,
    functionName: 'yesVotes',
  });

  const { data: needsMajority } = useReadContract({
    address: contractAddress,
    abi: GROUP_BUY_ESCROW_ABI,
    functionName: 'needsMajority',
  });

  const { data: participantCount } = useReadContract({
    address: contractAddress,
    abi: GROUP_BUY_ESCROW_ABI,
    functionName: 'participantCount',
  });

  const { data: timelockRefundDelay } = useReadContract({
    address: contractAddress,
    abi: GROUP_BUY_ESCROW_ABI,
    functionName: 'timelockRefundDelay',
  });

  const { writeContract: confirmDelivery, isSuccess: isConfirmSuccess } = useWriteContract();
  const { writeContract: releaseFunds, isSuccess: isReleaseSuccess } = useWriteContract();

  // Auto-sync after successful transactions
  React.useEffect(() => {
    if (isConfirmSuccess || isReleaseSuccess) {
      setTimeout(() => {
        onSync?.();
      }, 2000); // Wait 2 seconds for blockchain confirmation
    }
  }, [isConfirmSuccess, isReleaseSuccess, onSync]);

  // Calculate state
  const goal = fundingGoal ? BigInt(fundingGoal) : 0n;
  const deposited = totalDeposited ? BigInt(totalDeposited) : 0n;
  const progress = goal > 0n ? Number((deposited * 10000n) / goal) / 100 : 0;

  const isGoalReached = goalReachedAt ? Number(goalReachedAt) > 0 : false;
  const isDeliveryConfirmed = deliveryConfirmedAt ? Number(deliveryConfirmedAt) > 0 : false;
  const isReleased = released || false;

  const timelockDeadline = goalReachedAt && timelockRefundDelay
    ? Number(goalReachedAt) + Number(timelockRefundDelay)
    : 0;
  const timeUntilTimelock = timelockDeadline > 0 ? timelockDeadline - Date.now() / 1000 : 0;
  const isUrgent = timeUntilTimelock > 0 && timeUntilTimelock < 86400; // < 24 hours

  const votesNeeded = needsMajority ? Number(needsMajority) : 0;
  const currentVotes = yesVotes ? Number(yesVotes) : 0;
  const totalParticipants = participantCount ? Number(participantCount) : 0;
  const hasReachedMajority = currentVotes >= votesNeeded;

  // Handle delivery confirmation
  const handleConfirmDelivery = () => {
    if (!deliveryProofInput) return;

    confirmDelivery({
      address: contractAddress,
      abi: GROUP_BUY_ESCROW_ABI,
      functionName: 'confirmDelivery',
      args: [deliveryProofInput],
    });
    setShowDeliveryModal(false);
    setDeliveryProofInput('');
  };

  // Handle release
  const handleReleaseFunds = () => {
    releaseFunds({
      address: contractAddress,
      abi: GROUP_BUY_ESCROW_ABI,
      functionName: 'releaseFunds',
    });
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
        {/* Purchaser Card */}
        <div className={`w-full max-w-md relative z-10 mb-8 ${isUrgent && !isDeliveryConfirmed ? 'animate-pulse' : ''}`}>
          <TornPaperCard className={`${isUrgent && !isDeliveryConfirmed ? 'ring-4 ring-red-500 ring-offset-4' : ''}`}>
          <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-black border-dashed pb-4">
              <div>
                <h3 className="font-headline text-3xl uppercase leading-none mb-2">Group Buy Management</h3>
                <span className="bg-acid-lime text-void-black font-bold px-2 py-1 text-xs uppercase inline-block border-2 border-black">
                  PURCHASER
                </span>
              </div>
              <div className="text-right">
                {isReleased && (
                  <div className="bg-green-500 text-white font-bold px-3 py-1 text-xs uppercase inline-block border-2 border-black">
                    RELEASED
                  </div>
                )}
                {!isReleased && isGoalReached && (
                  <div className="bg-blue-500 text-white font-bold px-3 py-1 text-xs uppercase inline-block border-2 border-black">
                    FUNDED
                  </div>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="space-y-4 font-display">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 uppercase text-sm font-bold">Funding Goal</span>
                <span className="font-bold text-xl">{formatUnits(goal, 6)} USDC</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600 uppercase text-sm font-bold">Current Funding</span>
                <span className="font-bold text-xl">{formatUnits(deposited, 6)} USDC</span>
              </div>

              {/* Funding Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-bold">Progress</span>
                  <span className="font-bold">{progress.toFixed(1)}%</span>
                </div>
                <div className="h-4 bg-gray-200 border-2 border-black">
                  <div
                    className={`h-full transition-all duration-500 ${
                      isGoalReached ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              </div>

              {/* Participant List */}
              <div className="flex justify-between items-center pt-2 border-t-2 border-dashed border-black">
                <span className="text-gray-600 uppercase text-sm font-bold">Participants</span>
                <span className="font-bold">{totalParticipants}</span>
              </div>

              {/* Delivery Status */}
              {isGoalReached && !isDeliveryConfirmed && (
                <div className={`${isUrgent ? 'bg-red-100 border-red-500' : 'bg-blue-100 border-blue-500'} border-2 p-3`}>
                  <div className="flex items-center gap-2 mb-2">
                    {isUrgent && <AlertCircle className="w-4 h-4 text-red-700" />}
                    <p className={`font-bold text-sm ${isUrgent ? 'text-red-700' : 'text-blue-700'}`}>
                      {isUrgent ? 'URGENT: Confirm delivery soon!' : 'Waiting for delivery confirmation'}
                    </p>
                  </div>
                  {timelockDeadline > 0 && (
                    <p className="text-xs text-gray-600">
                      Timelock: {new Date(timelockDeadline * 1000).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {/* Delivery Proof Display */}
              {isDeliveryConfirmed && deliveryProof && (
                <div className="bg-green-50 border-2 border-green-500 p-3">
                  <p className="font-bold text-xs uppercase mb-1 text-green-700">✓ Delivery Confirmed</p>
                  <p className="text-sm font-mono break-all">{deliveryProof as string}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {deliveryConfirmedAt && new Date(Number(deliveryConfirmedAt) * 1000).toLocaleString()}
                  </p>
                </div>
              )}

              {/* Voting Progress */}
              {isDeliveryConfirmed && !isReleased && (
                <div className="bg-purple-50 border-2 border-purple-500 p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-sm">Voting Progress</span>
                    <span className="font-bold text-sm">{currentVotes}/{votesNeeded}</span>
                  </div>
                  <div className="h-3 bg-gray-200 border border-black">
                    <div
                      className="h-full bg-purple-500 transition-all duration-500"
                      style={{ width: `${Math.min((currentVotes / votesNeeded) * 100, 100)}%` }}
                    />
                  </div>
                  {hasReachedMajority && (
                    <p className="text-xs text-purple-700 font-bold mt-2">
                      ✓ Majority reached - Ready to release
                    </p>
                  )}
                </div>
              )}

              {/* Release Status */}
              {isReleased && (
                <div className="bg-green-100 border-2 border-green-500 p-3 text-center">
                  <p className="font-bold text-green-700 text-sm">✓ Funds Received</p>
                  <p className="text-green-600 text-xs mt-1">{formatUnits(deposited, 6)} USDC</p>
                </div>
              )}

              {/* Waiting for Funding */}
              {!isGoalReached && (
                <div className="bg-yellow-100 border-2 border-yellow-500 p-3 text-center">
                  <p className="font-bold text-yellow-700 text-sm">
                    Waiting for participants to fund...
                  </p>
                </div>
              )}
            </div>
          </div>
        </TornPaperCard>
      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-md space-y-3 relative z-10">
        {/* Confirm Delivery Button */}
        {isGoalReached && !isDeliveryConfirmed && (
          <TactileButton
            variant={isUrgent ? "secondary" : "primary"}
            className="w-full group"
            onClick={() => setShowDeliveryModal(true)}
          >
            <div className="p-2 flex items-center justify-center gap-4">
              <span className={`font-headline text-2xl uppercase tracking-widest ${
                isUrgent ? 'text-stark-white drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]' : 'text-void-black'
              }`}>
                Confirm Delivery
              </span>
              <Package className={`w-8 h-8 group-hover:scale-110 transition-transform ${
                isUrgent ? 'text-stark-white drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]' : 'text-void-black'
              }`} />
            </div>
          </TactileButton>
        )}

        {/* Trigger Release Button (optional/permissionless) */}
        {hasReachedMajority && !isReleased && (
          <TactileButton
            variant="primary"
            className="w-full group"
            onClick={handleReleaseFunds}
          >
            <div className="p-2 flex items-center justify-center gap-4">
              <span className="font-headline text-xl text-void-black uppercase tracking-widest">
                Trigger Release
              </span>
              <Send className="w-8 h-8 text-void-black group-hover:translate-x-2 transition-transform" />
            </div>
          </TactileButton>
        )}
      </div>

      {/* Delivery Confirmation Modal */}
      {showDeliveryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-stark-white border-4 border-black shadow-[8px_8px_0px_#000] p-6 max-w-md w-full">
            <h3 className="font-headline text-2xl uppercase mb-4">Confirm Delivery</h3>

            <div className="space-y-4">
              <div>
                <label className="font-display font-bold text-sm uppercase mb-2 block">
                  Delivery Proof
                </label>
                <textarea
                  value={deliveryProofInput}
                  onChange={(e) => setDeliveryProofInput(e.target.value)}
                  placeholder="Enter tracking number, photo hash, or proof URL..."
                  className="w-full border-2 border-black px-4 py-2 font-mono text-sm h-24 resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This will be visible to all participants for voting
                </p>
              </div>

              {isUrgent && (
                <div className="bg-red-50 border-2 border-red-500 p-3">
                  <p className="text-xs text-red-700 font-bold">
                    ⚠️ Timelock expiring soon! Confirm delivery to prevent refunds.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowDeliveryModal(false);
                    setDeliveryProofInput('');
                  }}
                  className="flex-1 border-2 border-black px-4 py-2 font-bold hover:bg-gray-100"
                >
                  Cancel
                </button>
                <TactileButton
                  variant="primary"
                  className="flex-1"
                  onClick={handleConfirmDelivery}
                  disabled={!deliveryProofInput.trim()}
                >
                  <span className="font-bold">Confirm</span>
                </TactileButton>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
