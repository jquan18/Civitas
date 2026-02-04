'use client';

import { useState } from 'react';
import * as React from 'react';
import { formatUnits, parseUnits } from 'viem';
import { useWriteContract, useReadContract } from 'wagmi';
import type { AllContracts } from '@/app/dashboard/page';
import TornPaperCard from '@/components/ui/TornPaperCard';
import TactileButton from '@/components/ui/TactileButton';
import { Wallet, Plus, Pause, Play, XCircle, AlertTriangle } from 'lucide-react';
import { STABLE_ALLOWANCE_TREASURY_ABI, ERC20_ABI } from '@/lib/contracts/abis';
import { BASE_USDC_ADDRESS } from '@/lib/contracts/constants';

interface OwnerViewProps {
  contract: AllContracts;
  userAddress: `0x${string}`;
  onSync?: () => void;
}

export default function OwnerView({ contract, userAddress, onSync }: OwnerViewProps) {
  const [depositAmount, setDepositAmount] = useState('');
  const [approvalCount, setApprovalCount] = useState('');
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [showStateControls, setShowStateControls] = useState(false);

  const contractAddress = contract.contract_address as `0x${string}`;

  // Read treasury status
  const { data: treasuryStatus } = useReadContract({
    address: contractAddress,
    abi: STABLE_ALLOWANCE_TREASURY_ABI,
    functionName: 'getTreasuryStatus',
  });

  const { data: usdcAllowance } = useReadContract({
    address: BASE_USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [userAddress, contractAddress],
  });

  const { writeContract: approveUSDC, isSuccess: isApproveSuccess } = useWriteContract();
  const { writeContract: deposit, isSuccess: isDepositSuccess } = useWriteContract();
  const { writeContract: incrementCounter, isSuccess: isIncrementSuccess } = useWriteContract();
  const { writeContract: pause, isSuccess: isPauseSuccess } = useWriteContract();
  const { writeContract: unpause, isSuccess: isUnpauseSuccess } = useWriteContract();
  const { writeContract: terminate, isSuccess: isTerminateSuccess } = useWriteContract();
  const { writeContract: emergencyWithdraw, isSuccess: isEmergencySuccess } = useWriteContract();

  // Auto-sync after successful transactions
  React.useEffect(() => {
    if (isApproveSuccess || isDepositSuccess || isIncrementSuccess || isPauseSuccess ||
        isUnpauseSuccess || isTerminateSuccess || isEmergencySuccess) {
      setTimeout(() => {
        onSync?.();
      }, 2000); // Wait 2 seconds for blockchain confirmation
    }
  }, [isApproveSuccess, isDepositSuccess, isIncrementSuccess, isPauseSuccess,
      isUnpauseSuccess, isTerminateSuccess, isEmergencySuccess, onSync]);

  // Parse treasury status
  const owner = treasuryStatus?.[0] as `0x${string}` | undefined;
  const recipient = treasuryStatus?.[1] as `0x${string}` | undefined;
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

  // Calculate runway
  const runway = allowancePerIncrement > 0n ? Number(balance / allowancePerIncrement) : 0;
  const isLowBalance = runway < 2;

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
        abi: STABLE_ALLOWANCE_TREASURY_ABI,
        functionName: 'deposit',
        args: [amount],
      });
      setShowDepositModal(false);
      setDepositAmount('');
    }
  };

  // Handle approval increment
  const handleApproval = () => {
    if (!approvalCount || Number(approvalCount) <= 0) return;

    incrementCounter({
      address: contractAddress,
      abi: STABLE_ALLOWANCE_TREASURY_ABI,
      functionName: 'incrementCounter',
      args: [BigInt(approvalCount)],
    });
    setShowApprovalModal(false);
    setApprovalCount('');
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
        {/* Owner Control Panel */}
        <div className="w-full max-w-md relative z-10 mb-8">
          <TornPaperCard className={`${isLowBalance ? 'ring-4 ring-red-500 ring-offset-4' : ''}`}>
          <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-black border-dashed pb-4">
              <div>
                <h3 className="font-headline text-3xl uppercase leading-none mb-2">Treasury Control</h3>
                <span className="bg-hot-pink text-stark-white font-bold px-2 py-1 text-xs uppercase inline-block border-2 border-black">
                  OWNER
                </span>
              </div>
              <div className="text-right">
                <div className={`${currentStateColor} text-black font-bold px-3 py-1 text-xs uppercase inline-block border-2 border-black`}>
                  {currentStateLabel}
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-4 font-display">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 uppercase text-sm font-bold">Treasury Balance</span>
                <span className="font-bold text-xl">{formatUnits(balance, 6)} USDC</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600 uppercase text-sm font-bold">Allowance/Claim</span>
                <span className="font-bold">{formatUnits(allowancePerIncrement, 6)} USDC</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600 uppercase text-sm font-bold">Runway</span>
                <span className={`font-bold ${isLowBalance ? 'text-red-600' : ''}`}>
                  {runway} claims
                </span>
              </div>

              {/* Counters */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t-2 border-dashed border-black">
                <div className="text-center">
                  <p className="text-xs text-gray-600 uppercase font-bold">Approved</p>
                  <p className="font-headline text-2xl">{approvalCounter}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-600 uppercase font-bold">Claimed</p>
                  <p className="font-headline text-2xl">{claimedCount}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-600 uppercase font-bold">Unclaimed</p>
                  <p className="font-headline text-2xl">
                    {unclaimed > 0 ? (
                      <span className="bg-acid-lime px-2 animate-pulse">{unclaimed}</span>
                    ) : (
                      unclaimed
                    )}
                  </p>
                </div>
              </div>

              {/* Recipient */}
              <div className="flex justify-between items-center pt-2 border-t-2 border-dashed border-black">
                <span className="text-gray-600 uppercase text-sm font-bold">Recipient</span>
                <span className="font-mono text-xs">
                  {recipient?.slice(0, 6)}...{recipient?.slice(-4)}
                </span>
              </div>

              {/* Low Balance Warning */}
              {isLowBalance && balance > 0n && (
                <div className="bg-red-100 border-2 border-red-500 p-3 text-center">
                  <p className="font-bold text-red-700 text-sm">⚠️ Low Balance Warning</p>
                  <p className="text-xs text-red-600 mt-1">
                    Only {runway} claim{runway !== 1 ? 's' : ''} remaining
                  </p>
                </div>
              )}

              {/* Unclaimed Indicator */}
              {unclaimed > 0 && (
                <div className="bg-blue-100 border-2 border-blue-500 p-3 text-center">
                  <p className="font-bold text-blue-700 text-sm">
                    {unclaimed} unclaimed allowance{unclaimed !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
          </div>
        </TornPaperCard>
      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-md space-y-3 relative z-10 mb-8">
        {/* Fund Treasury */}
        <TactileButton
          variant="primary"
          className="w-full group"
          onClick={() => setShowDepositModal(true)}
          disabled={state === 2}
        >
          <div className="p-2 flex items-center justify-center gap-3">
            <span className="font-headline text-lg md:text-xl text-void-black uppercase tracking-widest">
              Fund Treasury
            </span>
            <Wallet className="w-6 h-6 md:w-7 md:h-7 text-void-black group-hover:scale-110 transition-transform" />
          </div>
        </TactileButton>

        {/* Approve Allowances */}
        <TactileButton
          variant="primary"
          className="w-full group"
          onClick={() => setShowApprovalModal(true)}
          disabled={state !== 0}
        >
          <div className="p-2 flex items-center justify-center gap-3">
            <span className="font-headline text-lg md:text-xl text-void-black uppercase tracking-widest">
              Approve Allowances
            </span>
            <Plus className="w-6 h-6 md:w-7 md:h-7 text-void-black group-hover:rotate-90 transition-transform" />
          </div>
        </TactileButton>

        {/* State Management Toggle */}
        <button
          onClick={() => setShowStateControls(!showStateControls)}
          className="w-full border-2 border-black bg-stark-white px-4 py-2 font-bold hover:bg-gray-100 text-sm"
        >
          {showStateControls ? '▼' : '▶'} State Management
        </button>

        {showStateControls && (
          <div className="space-y-2 p-4 border-2 border-black bg-gray-50">
            {/* Pause/Unpause */}
            {state === 0 && (
              <button
                onClick={() => pause({
                  address: contractAddress,
                  abi: STABLE_ALLOWANCE_TREASURY_ABI,
                  functionName: 'pause',
                })}
                className="w-full border-2 border-black bg-warning-yellow px-4 py-2 font-bold hover:bg-yellow-400 flex items-center justify-center gap-2"
              >
                <Pause className="w-5 h-5" />
                Pause Treasury
              </button>
            )}

            {state === 1 && (
              <button
                onClick={() => unpause({
                  address: contractAddress,
                  abi: STABLE_ALLOWANCE_TREASURY_ABI,
                  functionName: 'unpause',
                })}
                className="w-full border-2 border-black bg-acid-lime px-4 py-2 font-bold hover:bg-lime-400 flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                Unpause Treasury
              </button>
            )}

            {/* Terminate */}
            <button
              onClick={() => setShowTerminateModal(true)}
              className="w-full border-2 border-black bg-red-500 text-white px-4 py-2 font-bold hover:bg-red-600 flex items-center justify-center gap-2"
              disabled={state === 2}
            >
              <XCircle className="w-5 h-5" />
              Terminate Treasury
            </button>

            {/* Emergency Withdraw */}
            {(state === 1 || state === 2) && (
              <button
                onClick={() => emergencyWithdraw({
                  address: contractAddress,
                  abi: STABLE_ALLOWANCE_TREASURY_ABI,
                  functionName: 'emergencyWithdraw',
                })}
                className="w-full border-2 border-black bg-red-500 text-white px-4 py-2 font-bold hover:bg-red-600 flex items-center justify-center gap-2"
              >
                <AlertTriangle className="w-5 h-5" />
                Emergency Withdraw
              </button>
            )}
          </div>
        )}
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-stark-white border-4 border-black shadow-[8px_8px_0px_#000] p-6 max-w-md w-full">
            <h3 className="font-headline text-2xl uppercase mb-4">Fund Treasury</h3>

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
                />
                {depositAmount && allowancePerIncrement > 0n && (
                  <p className="text-xs text-gray-500 mt-1">
                    New runway: +{Math.floor(Number(parseUnits(depositAmount, 6)) / Number(allowancePerIncrement))} claims
                  </p>
                )}
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
                  <span className="font-bold">Deposit</span>
                </TactileButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-stark-white border-4 border-black shadow-[8px_8px_0px_#000] p-6 max-w-md w-full">
            <h3 className="font-headline text-2xl uppercase mb-4">Approve Allowances</h3>

            <div className="space-y-4">
              <div>
                <label className="font-display font-bold text-sm uppercase mb-2 block">
                  Number of Allowances
                </label>
                <input
                  type="number"
                  value={approvalCount}
                  onChange={(e) => setApprovalCount(e.target.value)}
                  placeholder="1"
                  className="w-full border-2 border-black px-4 py-2 font-mono text-lg"
                  step="1"
                  min="1"
                />
                {approvalCount && (
                  <p className="text-xs text-gray-500 mt-1">
                    Total value: {formatUnits(allowancePerIncrement * BigInt(approvalCount), 6)} USDC
                  </p>
                )}
              </div>

              <div className="bg-blue-50 border-2 border-blue-500 p-3">
                <p className="text-xs text-blue-700">
                  Each approval allows the recipient to claim {formatUnits(allowancePerIncrement, 6)} USDC
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowApprovalModal(false);
                    setApprovalCount('');
                  }}
                  className="flex-1 border-2 border-black px-4 py-2 font-bold hover:bg-gray-100"
                >
                  Cancel
                </button>
                <TactileButton
                  variant="primary"
                  className="flex-1"
                  onClick={handleApproval}
                  disabled={!approvalCount || Number(approvalCount) <= 0}
                >
                  <span className="font-bold">Approve</span>
                </TactileButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Terminate Confirmation Modal */}
      {showTerminateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-stark-white border-4 border-black shadow-[8px_8px_0px_#000] p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
              <h3 className="font-headline text-2xl uppercase">Confirm Termination</h3>
            </div>

            <div className="bg-red-50 border-2 border-red-500 p-4 mb-4">
              <p className="font-display font-bold text-red-700 text-sm">
                This will withdraw all funds to you and permanently end the treasury.
              </p>
            </div>

            <div className="space-y-2 mb-4 text-sm">
              <p><strong>Balance to Withdraw:</strong> {formatUnits(balance, 6)} USDC</p>
              <p><strong>This action cannot be undone.</strong></p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowTerminateModal(false)}
                className="flex-1 border-2 border-black px-4 py-2 font-bold hover:bg-gray-100"
              >
                Cancel
              </button>
              <TactileButton
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  terminate({
                    address: contractAddress,
                    abi: STABLE_ALLOWANCE_TREASURY_ABI,
                    functionName: 'terminate',
                  });
                  setShowTerminateModal(false);
                }}
              >
                <span className="font-bold text-stark-white drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                  Terminate
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
