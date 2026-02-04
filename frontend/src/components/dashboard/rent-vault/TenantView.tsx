'use client';

import { useState } from 'react';
import * as React from 'react';
import { formatUnits, parseUnits } from 'viem';
import { useWriteContract, useReadContract } from 'wagmi';
import type { AllContracts } from '@/app/dashboard/page';
import TornPaperCard from '@/components/ui/TornPaperCard';
import TactileButton from '@/components/ui/TactileButton';
import { Wallet, AlertCircle } from 'lucide-react';
import { RENT_VAULT_ABI, ERC20_ABI } from '@/lib/contracts/abis';
import { BASE_USDC_ADDRESS } from '@/lib/contracts/constants';

interface TenantViewProps {
  contract: AllContracts;
  userAddress: `0x${string}`;
  onSync?: () => void;
}

export default function TenantView({ contract, userAddress, onSync }: TenantViewProps) {
  const [depositAmount, setDepositAmount] = useState('');
  const [showDepositModal, setShowDepositModal] = useState(false);

  const config = contract.config || {};
  const contractAddress = contract.contract_address as `0x${string}`;

  // Read tenant-specific data
  const { data: tenantBalance } = useReadContract({
    address: contractAddress,
    abi: RENT_VAULT_ABI,
    functionName: 'tenantBalances',
    args: [userAddress],
  });

  const { data: shareBps } = useReadContract({
    address: contractAddress,
    abi: RENT_VAULT_ABI,
    functionName: 'shareBps',
    args: [userAddress],
  });

  const { data: maxContribution } = useReadContract({
    address: contractAddress,
    abi: RENT_VAULT_ABI,
    functionName: 'tenantMaxContribution',
    args: [userAddress],
  });

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

  const { data: usdcAllowance } = useReadContract({
    address: BASE_USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [userAddress, contractAddress],
  });

  const { writeContract: approveUSDC, isSuccess: isApproveSuccess } = useWriteContract();
  const { writeContract: deposit, isSuccess: isDepositSuccess } = useWriteContract();

  // Auto-sync after successful transactions
  React.useEffect(() => {
    if (isApproveSuccess || isDepositSuccess) {
      setTimeout(() => {
        onSync?.();
      }, 2000); // Wait 2 seconds for blockchain confirmation
    }
  }, [isApproveSuccess, isDepositSuccess, onSync]);

  // Calculate progress
  const myDeposited = tenantBalance ? BigInt(tenantBalance) : 0n;
  const myMax = maxContribution ? BigInt(maxContribution) : 0n;
  const myShare = shareBps ? Number(shareBps) / 100 : 0;
  const totalRent = rentAmount ? BigInt(rentAmount) : 0n;
  const totalDepositedAmount = totalDeposited ? BigInt(totalDeposited) : 0n;

  const myProgress = myMax > 0n ? Number((myDeposited * 10000n) / myMax) / 100 : 0;
  const overallProgress = totalRent > 0n ? Number((totalDepositedAmount * 10000n) / totalRent) / 100 : 0;

  const remaining = myMax > myDeposited ? myMax - myDeposited : 0n;
  const isFullyFunded = totalDepositedAmount >= totalRent;
  const isPastDue = dueDate ? Date.now() / 1000 > Number(dueDate) : false;
  const isWithdrawn = withdrawn || false;

  // Handle deposit
  const handleDeposit = async () => {
    if (!depositAmount || Number(depositAmount) <= 0) return;

    const amount = parseUnits(depositAmount, 6);

    // Check if approval is needed
    const currentAllowance = usdcAllowance ? BigInt(usdcAllowance) : 0n;

    if (currentAllowance < amount) {
      // Approve first
      approveUSDC({
        address: BASE_USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [contractAddress, amount],
      });
    } else {
      // Deposit
      deposit({
        address: contractAddress,
        abi: RENT_VAULT_ABI,
        functionName: 'deposit',
        args: [amount],
      });
      setShowDepositModal(false);
      setDepositAmount('');
    }
  };

  // Determine status color
  let statusColor = 'bg-gray-300';
  let statusText = 'Not Deposited';

  if (myDeposited >= myMax) {
    statusColor = 'bg-acid-lime';
    statusText = 'Fully Deposited';
  } else if (myDeposited > 0n) {
    statusColor = 'bg-warning-yellow';
    statusText = 'Partially Deposited';
  } else if (isPastDue) {
    statusColor = 'bg-red-500';
    statusText = 'Overdue';
  }

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
        {/* Tenant Card */}
        <div className="w-full max-w-md relative z-10 mb-8">
          <TornPaperCard className="">
          <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-black border-dashed pb-4">
              <div>
                <h3 className="font-headline text-3xl uppercase leading-none mb-1">Your Rent Share</h3>
                <span className="bg-hot-pink text-stark-white font-bold px-2 py-1 text-xs uppercase inline-block border-2 border-black">
                  TENANT
                </span>
              </div>
              <div className="text-right">
                <div className={`${statusColor} text-black font-bold px-3 py-1 text-xs uppercase inline-block border-2 border-black`}>
                  {statusText}
                </div>
              </div>
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
                <span className="text-gray-600 uppercase text-sm font-bold">Your Deposited</span>
                <span className="font-bold">{formatUnits(myDeposited, 6)} USDC</span>
              </div>

              {/* Your Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-bold">Your Progress</span>
                  <span className="font-bold">{myProgress.toFixed(1)}%</span>
                </div>
                <div className="h-4 bg-gray-200 border-2 border-black">
                  <div
                    className={`h-full ${statusColor} transition-all duration-500`}
                    style={{ width: `${Math.min(myProgress, 100)}%` }}
                  />
                </div>
              </div>

              {/* Overall Progress */}
              <div className="space-y-2 pt-2 border-t-2 border-dashed border-black">
                <div className="flex justify-between text-xs">
                  <span className="font-bold">Overall Progress</span>
                  <span className="font-bold">{overallProgress.toFixed(1)}%</span>
                </div>
                <div className="h-3 bg-gray-200 border-2 border-black">
                  <div
                    className="h-full bg-purple-500 transition-all duration-500"
                    style={{ width: `${Math.min(overallProgress, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{formatUnits(totalDepositedAmount, 6)} USDC</span>
                  <span>{formatUnits(totalRent, 6)} USDC</span>
                </div>
              </div>

              {/* Due Date */}
              {dueDate && (
                <div className="flex justify-between items-center pt-2">
                  <span className="text-gray-600 uppercase text-sm font-bold">Due Date</span>
                  <span className="font-mono text-sm">
                    {new Date(Number(dueDate) * 1000).toLocaleDateString()}
                  </span>
                </div>
              )}

              {/* Status Messages */}
              {isFullyFunded && !isWithdrawn && (
                <div className="bg-green-100 border-2 border-green-500 p-3 text-center">
                  <p className="font-bold text-green-700 text-sm">✓ Fully Funded - Ready to Withdraw</p>
                </div>
              )}

              {isWithdrawn && (
                <div className="bg-blue-100 border-2 border-blue-500 p-3 text-center">
                  <p className="font-bold text-blue-700 text-sm">✓ Withdrawn to Landlord</p>
                </div>
              )}

              {isPastDue && !isFullyFunded && (
                <div className="bg-red-100 border-2 border-red-500 p-3 text-center flex items-center justify-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-700" />
                  <p className="font-bold text-red-700 text-sm">OVERDUE</p>
                </div>
              )}
            </div>
          </div>
        </TornPaperCard>
      </div>

      {/* Action Button */}
      {!isWithdrawn && !isPastDue && remaining > 0n && (
        <TactileButton
          variant="primary"
          className="w-full max-w-md group relative z-10"
          onClick={() => setShowDepositModal(true)}
        >
          <div className="p-2 flex items-center justify-center gap-4">
            <span className="font-headline text-2xl text-void-black uppercase tracking-widest">
              Deposit My Share
            </span>
            <Wallet className="w-8 h-8 text-void-black group-hover:scale-110 transition-transform" />
          </div>
        </TactileButton>
      )}

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-stark-white border-4 border-black shadow-[8px_8px_0px_#000] p-6 max-w-md w-full">
            <h3 className="font-headline text-2xl uppercase mb-4">Deposit USDC</h3>

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
                  <span className="font-bold">Deposit</span>
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
