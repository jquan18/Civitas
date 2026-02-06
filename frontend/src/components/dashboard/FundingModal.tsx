'use client';

import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { useAccount } from 'wagmi';
import { formatUnits } from 'viem';
import { LiFiBridgeStep, DirectFundingStep, BalancePoller } from '@/components/deploy';
import ScanningAnimation, { type ScanProgress } from './ScanningAnimation';
import RecommendedRouteCard from './RecommendedRouteCard';
import AlternativesSection from './AlternativesSection';
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

      // Find index of best route
      if (data.recommendation && data.recommendation.bestRoute) {
        const bestIndex = data.routes.findIndex((r: any) =>
          r.sourceChainId === data.recommendation.bestRoute.sourceChainId &&
          r.sourceToken === data.recommendation.bestRoute.sourceToken
        );
        setSelectedRouteIndex(bestIndex >= 0 ? bestIndex : 0);
      }

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

  // Auto-trigger scan when amount becomes valid on mainnet
  useEffect(() => {
    if (!isMainnet || !walletAddress) return;

    const amount = getAmount(debouncedAmount);
    if (amount <= 0) {
      setFlowState('idle');
      return;
    }

    // Auto-trigger scan when amount becomes valid
    if (flowState === 'idle') {
      handleScan();
    }
  }, [debouncedAmount, isMainnet, walletAddress, flowState, getAmount, handleScan]);

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
    setFlowState('results'); // Go back to results so user can try different route
  };

  const handleClose = () => {
    // Reset state when closing
    setFlowState('idle');
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
          {/* State: Idle */}
          {flowState === 'idle' && (
            <>
              {!isMainnet && (
                <div className="space-y-4">
                  {/* Testnet Info Banner */}
                  <div className="bg-[#FFD600] border-[3px] border-black shadow-[4px_4px_0px_#000] p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-black flex items-center justify-center">
                        <span className="text-white !text-white font-black text-lg" style={{ color: 'white' }}>!</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-headline text-sm uppercase mb-2 font-bold">
                          [TESTNET MODE]
                        </p>
                        <p className="font-mono text-xs mb-1">
                          Cross-chain bridge unavailable on Base Sepolia
                        </p>
                        <p className="font-mono text-xs text-gray-700">
                          → Switch to Base Mainnet for full LI.FI cross-chain funding
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Direct Transfer Button */}
                  {isAmountValid && (
                    <DirectFundingStep
                      destinationAddress={contractAddress}
                      amount={amount}
                      chainId={chainId}
                      onTransferCompleted={handleFundingCompleted}
                      onError={handleError}
                    />
                  )}
                </div>
              )}
              {isMainnet && !isAmountValid && (
                <StatusBanner variant="info">
                  Enter an amount to see AI-powered funding recommendations
                </StatusBanner>
              )}
            </>
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
                Bridge transaction submitted! Waiting for funds to arrive...
              </p>
              <BalancePoller
                contractAddress={contractAddress}
                requiredAmount={amount}
                chainId={chainId}
                onFunded={handleBalanceConfirmed}
              />
              <p className="text-xs text-gray-500 text-center mt-4">
                Cross-chain transfers typically take 1-5 minutes
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
