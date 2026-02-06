'use client';

import { useWriteContract } from 'wagmi';
import { useState } from 'react';
import { formatUnits } from 'viem';
import { getUsdcAddress } from '@/lib/lifi/constants';
import { AlertCircle } from 'lucide-react';

interface DirectFundingStepProps {
  destinationAddress: `0x${string}`;
  amount: bigint;
  chainId: number;
  onTransferCompleted: () => void;
  onError: (error: Error) => void;
}

const ERC20_TRANSFER_ABI = [
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

/**
 * Direct USDC transfer for TESTNET environments (Neobrutalist theme)
 *
 * Since LI.FI doesn't support testnets, this component allows users
 * to directly transfer USDC from their wallet to the contract.
 */
export function DirectFundingStep({
  destinationAddress,
  amount,
  chainId,
  onTransferCompleted,
  onError,
}: DirectFundingStepProps) {
  const [isPending, setIsPending] = useState(false);
  const { writeContractAsync } = useWriteContract();

  const usdcAddress = getUsdcAddress(chainId);
  const displayAmount = formatUnits(amount, 6);

  const handleTransfer = async () => {
    if (!usdcAddress) {
      onError(new Error('USDC not supported on this chain'));
      return;
    }

    try {
      setIsPending(true);
      await writeContractAsync({
        address: usdcAddress,
        abi: ERC20_TRANSFER_ABI,
        functionName: 'transfer',
        args: [destinationAddress, amount],
      });
      onTransferCompleted();
    } catch (err) {
      onError(err instanceof Error ? err : new Error('Transfer failed'));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Transfer Details Card */}
      <div className="bg-white border-[3px] border-black shadow-[6px_6px_0px_#000] p-6">
        <div className="space-y-4">
          {/* Amount Row */}
          <div className="flex justify-between items-center pb-4 border-b-[2px] border-gray-200">
            <span className="font-headline text-xs uppercase text-gray-600">Transfer Amount</span>
            <span className="font-mono text-2xl font-bold">{displayAmount} USDC</span>
          </div>

          {/* Destination Row */}
          <div className="flex justify-between items-start">
            <span className="font-headline text-xs uppercase text-gray-600">To Contract</span>
            <code className="font-mono text-xs bg-gray-100 border-[2px] border-black px-2 py-1">
              {destinationAddress.slice(0, 10)}...{destinationAddress.slice(-8)}
            </code>
          </div>
        </div>
      </div>

      {/* Transfer Button */}
      <button
        onClick={handleTransfer}
        disabled={isPending}
        className="w-full bg-black text-white font-mono uppercase py-4 border-[3px] border-black
                   hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed
                   transition-colors shadow-[4px_4px_0px_#CCFF00]
                   hover:shadow-[6px_6px_0px_#CCFF00] disabled:shadow-[4px_4px_0px_#666]
                   active:shadow-[2px_2px_0px_#CCFF00] active:translate-x-[2px] active:translate-y-[2px]"
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            Transferring...
          </span>
        ) : (
          `Transfer ${displayAmount} USDC →`
        )}
      </button>

      {/* Help Text */}
      <div className="flex items-start gap-2 bg-gray-100 border-[2px] border-black p-3">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p className="font-mono text-xs">
          Make sure you have <span className="font-bold">{displayAmount} USDC</span> on Base Sepolia testnet
        </p>
      </div>
    </div>
  );
}
