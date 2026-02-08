'use client';

import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { useAccount } from 'wagmi';
import { formatUnits } from 'viem';
import { LiFiBridgeStep, DirectFundingStep, BalancePoller } from '@/components/deploy';
import ScanningAnimation, { type ScanProgress } from './ScanningAnimation';
import RecommendedRouteCard from './RecommendedRouteCard';
import AlternativesSection from './AlternativesSection';
import FundingMethodSelector from './FundingMethodSelector';
import { isLiFiSupported } from '@/lib/lifi';
import { StatusBanner } from '@/components/ui/StatusBanner';
import { useDebounce } from '@/hooks/useDebounce';

interface FundingModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractAddress: `0x${string}`;
  chainId: number;
  requiredAmount?: bigint; // Optional - for custom amount input
  onFundingComplete?: () => void;
  contractType?: string; // For display purposes
}

type FundingFlowState =
  | 'idle'           // Waiting for valid amount input
  | 'direct'         // Direct USDC transfer
  | 'scanning'       // AI analyzing wallet + routes
  | 'results'        // Display best route + alternatives
  | 'executing'      // LiFiBridgeStep executing
  | 'polling'        // Waiting for balance confirmation
  | 'complete';      // Success

export default function FundingModal({
  isOpen,
  onClose,
  contractAddress,
  chainId,
  requiredAmount,
  onFundingComplete,
  contractType = 'contract',
}: FundingModalProps) {
  const { address: walletAddress } = useAccount();
  const [flowState, setFlowState] = useState<FundingFlowState>('idle');
  const [fundingMethod, setFundingMethod] = useState<'direct' | 'crosschain' | null>(null);
  const [fundingError, setFundingError] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');
  const debouncedAmount = useDebounce(customAmount, 800); // 800ms debounce

  // AI Flow State
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [analysisRoutes, setAnalysisRoutes] = useState<any[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [showAlternatives, setShowAlternatives] = useState(false);

  const isMainnet = isLiFiSupported(chainId);

  // Calculate amount to use
  const getAmount = useCallback((val?: string): bigint => {
    if (requiredAmount) return requiredAmount;
    const valueToParse = val !== undefined ? val : customAmount;
    if (valueToParse) {
      try {
        return BigInt(Math.floor(parseFloat(valueToParse) * 1e6));
      } catch {
        return BigInt(0);
      }
    }
    return BigInt(0);
  }, [requiredAmount, customAmount]);

  const handleScan = useCallback(async () => {
    const currentAmount = requiredAmount || getAmount(debouncedAmount);

    // Basic validation
    if (currentAmount <= 0 || !walletAddress) {
      return;
    }

    const amountStr = formatUnits(currentAmount, 6);

    setFlowState('scanning');
    setFundingError(null);
    setAnalysisRoutes([]);
    setScanProgress({
      step: 'wallet',
      message: 'Starting scan...',
    });

    try {
      const response = await fetch('/api/funding/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          destinationAddress: contractAddress,
          amount: amountStr
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze routes');
      }

      setAnalysisRoutes(data.routes);

      // Check for AI recommendation in localStorage
      let bestIndex = -1;

      // Try to find AI recommended route first
      if (typeof window !== 'undefined') {
        try {
          const storedRec = localStorage.getItem('civitas_ai_recommendation');
          if (storedRec) {
            const rec = JSON.parse(storedRec);
            // Look for matching route
            const aiIndex = data.routes.findIndex((r: any) =>
              r.sourceChainId === rec.sourceChainId &&
              (r.sourceToken === rec.sourceTokenSymbol || r.sourceTokenAddress === rec.sourceTokenAddress)
            );

            if (aiIndex >= 0) {
              bestIndex = aiIndex;
              console.log('Using AI recommended route:', rec);
              // Optional: Clear it so it doesn't persist forever, or keep it?
              // Let's keep it for now as the user might close/reopen
            }
          }
        } catch (e) {
          console.error('Failed to parse AI recommendation', e);
        }
      }

      // Fallback to API recommendation if no AI match found
      if (bestIndex === -1 && data.recommendation && data.recommendation.bestRoute) {
        bestIndex = data.routes.findIndex((r: any) =>
          r.sourceChainId === data.recommendation.bestRoute.sourceChainId &&
          r.sourceToken === data.recommendation.bestRoute.sourceToken
        );
      }

      setSelectedRouteIndex(bestIndex >= 0 ? bestIndex : 0);

      // If no routes found, show error
      if (!data.routes || data.routes.length === 0) {
        setFundingError('No optimal routes found. Your wallet may not have sufficient funds on supported chains.');
        setFlowState('idle');
      } else {
        setFlowState('results');
      }

    } catch (error: any) {
      console.error('Scan error:', error);
      setFundingError(error.message || 'Failed to scan wallet. Please try again.');
      setFlowState('idle');
    }
  }, [debouncedAmount, requiredAmount, walletAddress, contractAddress, getAmount]);

  const handleMethodSelect = (method: 'direct' | 'lifi') => {
    if (method === 'direct') {
      setFundingMethod('direct');
      setFlowState('direct');
    } else {
      setFundingMethod('crosschain');
      handleScan();
    }
  };

  const handleUseRoute = () => {
    // Check if this is a direct transfer (USDC on Base)
    if (selectedRoute?.isDirect) {
      setFlowState('executing');
    } else {
      // For bridge routes, go straight to execution
      setFlowState('executing');
    }
  };

  const handleSeeAlternatives = () => {
    setShowAlternatives(true);
  };

  const handleCollapseAlternatives = () => {
    setShowAlternatives(false);
  };

  const handleRouteSelect = (route: any) => {
    const index = analysisRoutes.findIndex(
      r => r.sourceChainId === route.sourceChainId && r.sourceToken === route.sourceToken
    );
    if (index >= 0) {
      setSelectedRouteIndex(index);
    }
    setShowAlternatives(false);
  };

  const handleFundingCompleted = () => {
    setFlowState('polling');
  };

  const handleBalanceConfirmed = () => {
    setFlowState('complete');
    if (onFundingComplete) {
      onFundingComplete();
    }
  };

  const handleError = (error: Error) => {
    setFundingError(error.message);
    if (fundingMethod === 'direct') {
      setFlowState('direct'); // Stay in direct state for retry
    } else {
      setFlowState('results'); // Go back to results so user can try different route
    }
  };

  const handleClose = () => {
    // Reset state when closing
    setFlowState('idle');
    setFundingMethod(null);
    setFundingError(null);
    setCustomAmount('');
    setAnalysisRoutes([]);
    setShowAlternatives(false);
    setScanProgress(null);
    onClose();
  };

  const handleSkipToManual = () => {
    setFlowState('executing');
  };

  if (!isOpen) return null;

  const amount = getAmount();
  const isAmountValid = amount > 0;
  const amountDisplay = formatUnits(amount, 6);
  const selectedRoute = analysisRoutes[selectedRouteIndex];

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
                    disabled={flowState !== 'idle'}
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

          {/* Flow States */}
          {/* State: Idle - amount input (only when no requiredAmount) */}
          {flowState === 'idle' && !isAmountValid && (
            <StatusBanner variant="info">
              Enter an amount to continue
            </StatusBanner>
          )}

          {/* Show method selector as soon as amount is valid (or requiredAmount provided) */}
          {(flowState === 'idle' && isAmountValid) && (
            <div className="space-y-4">
              <FundingMethodSelector
                onSelect={handleMethodSelect}
                showLiFi={isMainnet}
              />
            </div>
          )}

          {/* State: Direct Transfer */}
          {flowState === 'direct' && isAmountValid && (
            <div className="space-y-4">
              <DirectFundingStep
                destinationAddress={contractAddress}
                amount={amount}
                chainId={chainId}
                onTransferCompleted={handleFundingCompleted}
                onError={handleError}
              />
              <button
                onClick={() => { setFlowState('idle'); setFundingError(null); }}
                className="block mx-auto font-mono text-xs text-gray-500 underline hover:text-black"
              >
                ← Back to funding methods
              </button>
            </div>
          )}

          {/* State: Scanning */}
          {flowState === 'scanning' && scanProgress && (
            <ScanningAnimation
              progress={scanProgress}
              onSkip={handleSkipToManual}
            />
          )}

          {/* State: Results */}
          {flowState === 'results' && selectedRoute && (
            <>
              {!showAlternatives ? (
                <RecommendedRouteCard
                  route={selectedRoute}
                  amount={amountDisplay}
                  onExecute={handleUseRoute}
                  onSeeAlternatives={handleSeeAlternatives}
                />
              ) : (
                <AlternativesSection
                  routes={analysisRoutes}
                  recommendedIndex={selectedRouteIndex}
                  requiredAmount={amountDisplay}
                  onSelectRoute={handleRouteSelect}
                  onCollapse={handleCollapseAlternatives}
                />
              )}
            </>
          )}

          {/* State: Executing */}
          {flowState === 'executing' && isAmountValid && (
            <>
              {selectedRoute?.isDirect ? (
                <DirectFundingStep
                  destinationAddress={contractAddress}
                  amount={amount}
                  chainId={chainId}
                  onTransferCompleted={handleFundingCompleted}
                  onError={handleError}
                />
              ) : (
                <LiFiBridgeStep
                  destinationAddress={contractAddress}
                  amount={amount}
                  onBridgeStarted={(hash) => console.log('Bridge tx:', hash)}
                  onBridgeCompleted={handleFundingCompleted}
                  onError={handleError}
                  preselectedRoute={selectedRoute ? {
                    sourceChainId: selectedRoute.sourceChainId,
                    sourceTokenAddress: selectedRoute.sourceTokenAddress,
                    sourceToken: selectedRoute.sourceToken,
                    tool: selectedRoute.tool,
                    isDirect: selectedRoute.isDirect,
                    action: selectedRoute.action,
                  } : undefined}
                  autoExecute={!!selectedRoute?.action}
                />
              )}
            </>
          )}

          {/* State: Polling */}
          {flowState === 'polling' && (
            <div className="space-y-4">
              <h3 className="font-headline text-xl uppercase">Waiting for Funds</h3>
              <p className="font-display text-sm text-gray-600">
                {fundingMethod === 'direct'
                  ? 'Transfer submitted! Waiting for confirmation...'
                  : 'Bridge transaction submitted! Waiting for funds to arrive...'}
              </p>
              <BalancePoller
                contractAddress={contractAddress}
                requiredAmount={amount}
                chainId={chainId}
                onFunded={handleBalanceConfirmed}
              />
              <p className="text-xs text-gray-500 text-center mt-4">
                {fundingMethod === 'direct'
                  ? 'On-chain transfers typically confirm within a few seconds'
                  : 'Cross-chain transfers typically take 1-5 minutes'}
              </p>
            </div>
          )}

          {/* State: Complete */}
          {flowState === 'complete' && (
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
