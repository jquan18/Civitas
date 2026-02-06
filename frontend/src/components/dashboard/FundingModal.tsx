'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import FundingMethodSelector, { type FundingMethod } from './FundingMethodSelector';
import { LiFiBridgeStep, DirectFundingStep, BalancePoller } from '@/components/deploy';
import { isLiFiSupported } from '@/lib/lifi';
import { StatusBanner } from '@/components/ui/StatusBanner';

interface FundingModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractAddress: `0x${string}`;
  chainId: number;
  requiredAmount?: bigint; // Optional - for custom amount input
  onFundingComplete?: () => void;
  contractType?: string; // For display purposes
}

export default function FundingModal({
  isOpen,
  onClose,
  contractAddress,
  chainId,
  requiredAmount,
  onFundingComplete,
  contractType = 'contract',
}: FundingModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<FundingMethod | null>(null);
  const [fundingStep, setFundingStep] = useState<'idle' | 'funding' | 'polling' | 'complete'>('idle');
  const [fundingError, setFundingError] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [recommendedSource, setRecommendedSource] = useState<any>(null);

  const isMainnet = isLiFiSupported(chainId);

  // Load AI recommendation from local storage
  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem('civitas_ai_recommendation');
      if (stored) {
        try {
          setRecommendedSource(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to parse AI recommendation', e);
        }
      }
    }
  }, [isOpen]);

  // Calculate amount to use
  const getAmount = (): bigint => {
    if (requiredAmount) return requiredAmount;
    if (customAmount) {
      try {
        return BigInt(Math.floor(parseFloat(customAmount) * 1e6));
      } catch {
        return BigInt(0);
      }
    }
    return BigInt(0);
  };

  const handleMethodSelect = (method: FundingMethod) => {
    setSelectedMethod(method);
    setFundingError(null);
  };

  const handleBack = () => {
    setSelectedMethod(null);
    setFundingStep('idle');
    setFundingError(null);
  };

  const handleFundingCompleted = () => {
    setFundingStep('polling');
  };

  const handleBalanceConfirmed = () => {
    setFundingStep('complete');
    if (onFundingComplete) {
      onFundingComplete();
    }
  };

  const handleError = (error: Error) => {
    setFundingError(error.message);
  };

  const handleClose = () => {
    // Reset state when closing
    setSelectedMethod(null);
    setFundingStep('idle');
    setFundingError(null);
    setCustomAmount('');
    onClose();
  };

  if (!isOpen) return null;

  const amount = getAmount();
  const isAmountValid = amount > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white border-[4px] border-black shadow-[8px_8px_0px_#000] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-warning-yellow border-b-[4px] border-black p-4 flex items-center justify-between sticky top-0 z-10">
          <h2 className="font-headline text-2xl uppercase">Fund {contractType}</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-black hover:text-white transition-colors border-[2px] border-black"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Contract Info */}
          <div className="bg-gray-100 border-[2px] border-black p-4 mb-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Contract Address</span>
                <code className="font-mono text-xs">
                  {contractAddress.slice(0, 10)}...{contractAddress.slice(-8)}
                </code>
              </div>
              {requiredAmount && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Required Amount</span>
                  <span className="font-mono font-bold">
                    {(Number(requiredAmount) / 1e6).toLocaleString()} USDC
                  </span>
                </div>
              )}
              {!requiredAmount && (
                <div className="space-y-2">
                  <label className="block text-sm text-gray-600">Amount (USDC)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="Enter amount..."
                    className="w-full border-[2px] border-black px-3 py-2 font-mono text-lg"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Error Display */}
          {fundingError && (
            <div className="mb-6">
              <StatusBanner variant="error" onDismiss={() => setFundingError(null)}>
                {fundingError}
              </StatusBanner>
            </div>
          )}

          {/* Step 1: Method Selection */}
          {!selectedMethod && fundingStep === 'idle' && (
            <FundingMethodSelector onSelect={handleMethodSelect} showLiFi={isMainnet} />
          )}

          {/* Step 2: Direct Transfer */}
          {selectedMethod === 'direct' && fundingStep === 'idle' && (
            <div className="space-y-4">
              <button
                onClick={handleBack}
                className="text-sm underline hover:no-underline mb-4"
              >
                ← Back to method selection
              </button>

              {isAmountValid ? (
                <DirectFundingStep
                  destinationAddress={contractAddress}
                  amount={amount}
                  chainId={chainId}
                  onTransferCompleted={handleFundingCompleted}
                  onError={handleError}
                />
              ) : (
                <StatusBanner variant="warning">
                  Please enter a valid amount to continue
                </StatusBanner>
              )}
            </div>
          )}

          {/* Step 2: LI.FI Bridge */}
          {selectedMethod === 'lifi' && fundingStep === 'idle' && (
            <div className="space-y-4">
              <button
                onClick={handleBack}
                className="text-sm underline hover:no-underline mb-4"
              >
                ← Back to method selection
              </button>

              {isAmountValid ? (
                <LiFiBridgeStep
                  destinationAddress={contractAddress}
                  amount={amount}
                  onBridgeStarted={(hash) => console.log('Bridge tx:', hash)}
                  onBridgeCompleted={handleFundingCompleted}
                  onError={handleError}
                />
              ) : (
                <StatusBanner variant="warning">
                  Please enter a valid amount to continue
                </StatusBanner>
              )}
            </div>
          )}

          {/* Step 3: Polling for Balance */}
          {fundingStep === 'polling' && (
            <div className="space-y-4">
              <h3 className="font-headline text-xl uppercase">Waiting for Funds</h3>
              <p className="font-display text-sm text-gray-600">
                {selectedMethod === 'lifi'
                  ? 'Bridge transaction submitted! Waiting for funds to arrive...'
                  : 'Transfer submitted! Waiting for confirmation...'}
              </p>
              <BalancePoller
                contractAddress={contractAddress}
                requiredAmount={amount}
                chainId={chainId}
                onFunded={handleBalanceConfirmed}
              />
              {selectedMethod === 'lifi' && (
                <p className="text-xs text-gray-500 text-center mt-4">
                  Cross-chain transfers typically take 1-5 minutes
                </p>
              )}
            </div>
          )}

          {/* Step 4: Complete */}
          {fundingStep === 'complete' && (
            <div className="bg-acid-lime border-[3px] border-black p-8 text-center">
              <div className="text-6xl mb-4">✓</div>
              <h3 className="font-headline text-2xl uppercase mb-2">Funding Complete!</h3>
              <p className="font-display text-sm mb-6">
                Your {contractType} has been successfully funded.
              </p>
              <button
                onClick={handleClose}
                className="bg-black text-white font-mono uppercase px-6 py-3 border-[3px] border-black hover:bg-gray-800 transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
