'use client';

import { useState } from 'react';
import * as React from 'react';
import { formatUnits, parseUnits } from 'viem';
import { useWriteContract, useReadContract } from 'wagmi';
import type { AllContracts } from '@/app/dashboard/page';
import TornPaperCard from '@/components/ui/TornPaperCard';
import TactileButton from '@/components/ui/TactileButton';
import { Wallet, ThumbsUp, RefreshCw, Clock } from 'lucide-react';
import { GROUP_BUY_ESCROW_ABI, ERC20_ABI } from '@/lib/contracts/abis';
import { BASE_USDC_ADDRESS } from '@/lib/contracts/constants';

interface ParticipantViewProps {
  contract: AllContracts;
  userAddress: `0x${string}`;
  onSync?: () => void;
}

export default function ParticipantView({ contract, userAddress, onSync }: ParticipantViewProps) {
  const [depositAmount, setDepositAmount] = useState('');
  const [showDepositModal, setShowDepositModal] = useState(false);

  const contractAddress = contract.contract_address as `0x${string}`;

  // Read participant-specific data
  const { data: myDeposit } = useReadContract({
    address: contractAddress,
    abi: GROUP_BUY_ESCROW_ABI,
    functionName: 'deposits',
    args: [userAddress],
  });

  const { data: shareBps } = useReadContract({
    address: contractAddress,
    abi: GROUP_BUY_ESCROW_ABI,
    functionName: 'shareBps',
    args: [userAddress],
  });

  const { data: maxContribution } = useReadContract({
    address: contractAddress,
    abi: GROUP_BUY_ESCROW_ABI,
    functionName: 'participantMaxContribution',
    args: [userAddress],
  });

  const { data: hasVoted } = useReadContract({
    address: contractAddress,
    abi: GROUP_BUY_ESCROW_ABI,
    functionName: 'hasVoted',
    args: [userAddress],
  });

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

  const { data: expiryDate } = useReadContract({
    address: contractAddress,
    abi: GROUP_BUY_ESCROW_ABI,
    functionName: 'expiryDate',
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

  const { data: usdcAllowance } = useReadContract({
    address: BASE_USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [userAddress, contractAddress],
  });

  const { writeContract: approveUSDC, isSuccess: isApproveSuccess } = useWriteContract();
  const { writeContract: deposit, isSuccess: isDepositSuccess } = useWriteContract();
  const { writeContract: voteRelease, isSuccess: isVoteSuccess } = useWriteContract();
  const { writeContract: refund, isSuccess: isRefundSuccess } = useWriteContract();
  const { writeContract: timelockRefund, isSuccess: isTimelockRefundSuccess } = useWriteContract();

  // Auto-sync after successful transactions
  React.useEffect(() => {
    if (isApproveSuccess || isDepositSuccess || isVoteSuccess || isRefundSuccess || isTimelockRefundSuccess) {
      setTimeout(() => {
        onSync?.();
      }, 2000); // Wait 2 seconds for blockchain confirmation
    }
  }, [isApproveSuccess, isDepositSuccess, isVoteSuccess, isRefundSuccess, isTimelockRefundSuccess, onSync]);

  // Calculate state
  const myDepositAmount = myDeposit ? BigInt(myDeposit) : 0n;
  const myMax = maxContribution ? BigInt(maxContribution) : 0n;
  const myShare = shareBps ? Number(shareBps) / 100 : 0;
  const goal = fundingGoal ? BigInt(fundingGoal) : 0n;
  const deposited = totalDeposited ? BigInt(totalDeposited) : 0n;
  const progress = goal > 0n ? Number((deposited * 10000n) / goal) / 100 : 0;
  const remaining = myMax > myDepositAmount ? myMax - myDepositAmount : 0n;

  const isExpired = expiryDate ? Date.now() / 1000 > Number(expiryDate) : false;
  const isGoalReached = goalReachedAt ? Number(goalReachedAt) > 0 : false;
  const isDeliveryConfirmed = deliveryConfirmedAt ? Number(deliveryConfirmedAt) > 0 : false;
  const isReleased = released || false;
  const hasUserVoted = hasVoted || false;

  const timelockDeadline = goalReachedAt && timelockRefundDelay
    ? Number(goalReachedAt) + Number(timelockRefundDelay)
    : 0;
  const isTimelockExpired = timelockDeadline > 0 && Date.now() / 1000 > timelockDeadline;

  const votesNeeded = needsMajority ? Number(needsMajority) : 0;
  const currentVotes = yesVotes ? Number(yesVotes) : 0;
  const totalParticipants = participantCount ? Number(participantCount) : 0;

  // Determine phase
  let phase = 1;
  let phaseText = 'Funding';
  let phaseColor = 'bg-warning-yellow';

  if (isReleased) {
    phase = 4;
    phaseText = 'Complete';
    phaseColor = 'bg-green-500';
  } else if (isDeliveryConfirmed) {
    phase = 3;
    phaseText = 'Voting';
    phaseColor = 'bg-purple-500';
  } else if (isGoalReached) {
    phase = 2;
    phaseText = 'Delivery';
    phaseColor = 'bg-blue-500';
  }

  // Handle deposit
  const handleDeposit = async () => {
    if (!depositAmount || Number(depositAmount) <= 0) return;

    const amount = parseUnits(depositAmount, 6);
    const currentAllowance = usdcAllowance ? BigInt(usdcAllowance) : 0n;

    if (currentAllowance < amount) {
      approveUSDC({
        address: BASE_USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [contractAddress, amount],
      });
    } else {
      deposit({
        address: contractAddress,
        abi: GROUP_BUY_ESCROW_ABI,
        functionName: 'deposit',
        args: [amount],
      });
      setShowDepositModal(false);
      setDepositAmount('');
    }
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
        {/* Participant Card */}
        <div className="w-full max-w-md relative z-10 mb-8">
          <TornPaperCard className="">
          <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-black border-dashed pb-4">
              <div>
                <h3 className="font-headline text-3xl uppercase leading-none mb-2">Group Buy</h3>
                <span className="bg-hot-pink text-stark-white font-bold px-2 py-1 text-xs uppercase inline-block border-2 border-black">
                  PARTICIPANT
                </span>
              </div>
              <div className="text-right">
                <div className={`${phaseColor} text-white font-bold px-3 py-1 text-xs uppercase inline-block border-2 border-black mb-1`}>
                  {phaseText}
                </div>
              </div>
            </div>

            {/* Stage Indicator */}
            <div className="flex justify-between items-center">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex flex-col items-center flex-1">
                  <div className={`w-8 h-8 rounded-full border-2 border-black flex items-center justify-center font-bold text-sm ${
                    phase >= step ? 'bg-acid-lime' : 'bg-gray-300'
                  }`}>
                    {step}
                  </div>
                  <span className="text-xs mt-1 font-bold">
                    {step === 1 && 'Fund'}
                    {step === 2 && 'Deliver'}
                    {step === 3 && 'Vote'}
                    {step === 4 && 'Done'}
                  </span>
                </div>
              ))}
            </div>

            {/* Details */}
            <div className="space-y-4 font-display">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 uppercase text-sm font-bold">Your Share</span>
                <span className="font-bold text-xl">{myShare}%</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600 uppercase text-sm font-bold">Your Max</span>
                <span className="font-bold">{formatUnits(myMax, 6)} USDC</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600 uppercase text-sm font-bold">Your Contribution</span>
                <span className="font-bold">{formatUnits(myDepositAmount, 6)} USDC</span>
              </div>

              {/* Funding Progress */}
              <div className="space-y-2 pt-2 border-t-2 border-dashed border-black">
                <div className="flex justify-between text-xs">
                  <span className="font-bold">Funding Progress</span>
                  <span className="font-bold">{progress.toFixed(1)}%</span>
                </div>
                <div className="h-4 bg-gray-200 border-2 border-black">
                  <div
                    className="h-full bg-blue-500 transition-all duration-500"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{formatUnits(deposited, 6)} USDC</span>
                  <span>{formatUnits(goal, 6)} USDC</span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600 uppercase text-sm font-bold">Participants</span>
                <span className="font-bold">{totalParticipants}</span>
              </div>

              {/* Delivery Proof */}
              {isDeliveryConfirmed && deliveryProof && (
                <div className="bg-blue-50 border-2 border-blue-500 p-3">
                  <p className="font-bold text-xs uppercase mb-1">Delivery Proof</p>
                  <p className="text-sm font-mono break-all">{deliveryProof as string}</p>
                </div>
              )}

              {/* Voting Status */}
              {isDeliveryConfirmed && !isReleased && (
                <div className="bg-purple-50 border-2 border-purple-500 p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-sm">Voting Progress</span>
                    <span className="font-bold text-sm">{currentVotes}/{votesNeeded}</span>
                  </div>
                  <div className="h-2 bg-gray-200 border border-black">
                    <div
                      className="h-full bg-purple-500"
                      style={{ width: `${Math.min((currentVotes / votesNeeded) * 100, 100)}%` }}
                    />
                  </div>
                  {hasUserVoted && (
                    <p className="text-xs text-purple-700 font-bold mt-2">✓ You Voted</p>
                  )}
                </div>
              )}

              {/* Phase-specific messages */}
              {phase === 1 && !isExpired && (
                <div className="bg-yellow-100 border-2 border-yellow-500 p-3 text-center">
                  <p className="font-bold text-yellow-700 text-sm">
                    Funding in progress...
                  </p>
                </div>
              )}

              {phase === 1 && isExpired && !isGoalReached && (
                <div className="bg-red-100 border-2 border-red-500 p-3 text-center">
                  <p className="font-bold text-red-700 text-sm">
                    Goal not reached - Refund available
                  </p>
                </div>
              )}

              {phase === 2 && !isTimelockExpired && (
                <div className="bg-blue-100 border-2 border-blue-500 p-3 text-center">
                  <p className="font-bold text-blue-700 text-sm">
                    Waiting for purchaser to confirm delivery...
                  </p>
                  {timelockDeadline > 0 && (
                    <p className="text-xs text-blue-600 mt-1">
                      Timelock: {new Date(timelockDeadline * 1000).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {phase === 2 && isTimelockExpired && (
                <div className="bg-red-100 border-2 border-red-500 p-3 text-center">
                  <p className="font-bold text-red-700 text-sm">
                    Timelock expired - Refund available
                  </p>
                </div>
              )}

              {isReleased && (
                <div className="bg-green-100 border-2 border-green-500 p-3 text-center">
                  <p className="font-bold text-green-700 text-sm">
                    ✓ Funds Released to Purchaser
                  </p>
                </div>
              )}
            </div>
          </div>
        </TornPaperCard>
      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-md space-y-3 relative z-10">
        {/* Phase 1: Funding */}
        {phase === 1 && !isExpired && !isGoalReached && remaining > 0n && (
          <TactileButton
            variant="primary"
            className="w-full group"
            onClick={() => setShowDepositModal(true)}
          >
            <div className="p-2 flex items-center justify-center gap-4">
              <span className="font-headline text-2xl text-void-black uppercase tracking-widest">
                Contribute to Goal
              </span>
              <Wallet className="w-8 h-8 text-void-black group-hover:scale-110 transition-transform" />
            </div>
          </TactileButton>
        )}

        {/* Phase 1: Expired & Not Funded */}
        {phase === 1 && isExpired && !isGoalReached && myDepositAmount > 0n && (
          <TactileButton
            variant="secondary"
            className="w-full group"
            onClick={() => refund({
              address: contractAddress,
              abi: GROUP_BUY_ESCROW_ABI,
              functionName: 'refund',
            })}
          >
            <div className="p-2 flex items-center justify-center gap-4">
              <span className="font-headline text-xl text-stark-white uppercase tracking-widest drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                Claim Refund
              </span>
              <RefreshCw className="w-8 h-8 text-stark-white drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]" />
            </div>
          </TactileButton>
        )}

        {/* Phase 2: Timelock Expired */}
        {phase === 2 && isTimelockExpired && !isDeliveryConfirmed && myDepositAmount > 0n && (
          <TactileButton
            variant="secondary"
            className="w-full group"
            onClick={() => timelockRefund({
              address: contractAddress,
              abi: GROUP_BUY_ESCROW_ABI,
              functionName: 'timelockRefund',
            })}
          >
            <div className="p-2 flex items-center justify-center gap-4">
              <span className="font-headline text-xl text-stark-white uppercase tracking-widest drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                Claim Timelock Refund
              </span>
              <Clock className="w-8 h-8 text-stark-white drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]" />
            </div>
          </TactileButton>
        )}

        {/* Phase 3: Voting */}
        {phase === 3 && !isReleased && !hasUserVoted && (
          <TactileButton
            variant="primary"
            className="w-full group"
            onClick={() => voteRelease({
              address: contractAddress,
              abi: GROUP_BUY_ESCROW_ABI,
              functionName: 'voteRelease',
            })}
          >
            <div className="p-2 flex items-center justify-center gap-4">
              <span className="font-headline text-2xl text-void-black uppercase tracking-widest">
                Vote to Release Funds
              </span>
              <ThumbsUp className="w-8 h-8 text-void-black group-hover:scale-110 transition-transform" />
            </div>
          </TactileButton>
        )}
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-stark-white border-4 border-black shadow-[8px_8px_0px_#000] p-6 max-w-md w-full">
            <h3 className="font-headline text-2xl uppercase mb-4">Contribute USDC</h3>

            <div className="space-y-4">
              <div>
                <label className="font-display font-bold text-sm uppercase mb-2 block">
                  Amount (USDC)
                </label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full border-2 border-black px-4 py-2 font-mono text-lg"
                  step="0.01"
                  min="0"
                  max={formatUnits(remaining, 6)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Remaining: {formatUnits(remaining, 6)} USDC
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setDepositAmount(formatUnits(remaining / 2n, 6))}
                  className="flex-1 border-2 border-black px-3 py-1 text-sm font-bold hover:bg-gray-100"
                >
                  50%
                </button>
                <button
                  onClick={() => setDepositAmount(formatUnits(remaining, 6))}
                  className="flex-1 border-2 border-black px-3 py-1 text-sm font-bold hover:bg-gray-100"
                >
                  MAX
                </button>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowDepositModal(false);
                    setDepositAmount('');
                  }}
                  className="flex-1 border-2 border-black px-4 py-2 font-bold hover:bg-gray-100"
                >
                  Cancel
                </button>
                <TactileButton
                  variant="primary"
                  className="flex-1"
                  onClick={handleDeposit}
                  disabled={!depositAmount || Number(depositAmount) <= 0}
                >
                  <span className="font-bold">Contribute</span>
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
