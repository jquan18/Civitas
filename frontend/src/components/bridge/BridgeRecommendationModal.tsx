'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAccount } from 'wagmi';
import { LiFiBridgeStep } from '@/components/deploy';
import { StatusBanner } from '@/components/ui/StatusBanner';
import { LoadingSquares } from '@/components/ui/LoadingSquares';

interface BridgeRecommendationModalProps {
  isOpen: boolean;
  onClose: () => void;
  route: {
    sourceChainId: number;
    sourceToken: string;
    sourceTokenAddress: string;
    gasCostUsd: string;
    executionDuration: number; // seconds
    tool: string;
  };
  walletAddress: `0x${string}`; // User's wallet on Base (destination for bridge)
  amount: string; // Amount in USDC (e.g., "1000")
  onBridgeCompleted?: () => void;
  onDecline?: () => void;
}

type ModalState = 'idle' | 'ready' | 'executing' | 'completed' | 'error';

// Chain info mapping
const CHAIN_INFO: Record<number, { name: string; icon: string; color: string }> = {
  1: { name: 'Ethereum', icon: '⟠', color: '#627EEA' },
  42161: { name: 'Arbitrum', icon: '🔷', color: '#28A0F0' },
  10: { name: 'Optimism', icon: '🔴', color: '#FF0420' },
  137: { name: 'Polygon', icon: '⬡', color: '#8247E5' },
  8453: { name: 'Base', icon: '🔵', color: '#0052FF' },
};

export default function BridgeRecommendationModal({
  isOpen,
  onClose,
  route,
  walletAddress,
  amount,
  onBridgeCompleted,
  onDecline,
}: BridgeRecommendationModalProps) {
  const { address: connectedAddress } = useAccount();
  const [modalState, setModalState] = useState<ModalState>('idle');
  const [error, setError] = useState<string | null>(null);

  // Convert amount to bigint (6 decimals for USDC)
  const amountBigInt = BigInt(Math.floor(parseFloat(amount) * 1e6));

  useEffect(() => {
    if (isOpen) {
      setModalState('ready');
      setError(null);
    }
  }, [isOpen]);

  const handleBridgeNow = () => {
    setModalState('executing');
    setError(null);
  };

  const handleSkip = () => {
    if (onDecline) {
      onDecline();
    }
    handleClose();
  };

  const handleClose = () => {
    setModalState('idle');
    setError(null);
    onClose();
  };

  const handleBridgeStarted = (txHash: string) => {
    console.log('Bridge transaction started:', txHash);
  };

  const handleBridgeCompleted = () => {
    setModalState('completed');
    if (onBridgeCompleted) {
      onBridgeCompleted();
    }
  };

  const handleError = (err: Error) => {
    setError(err.message);
    setModalState('error');
  };

  if (!isOpen) return null;

  const sourceChain = CHAIN_INFO[route.sourceChainId] || { name: 'Unknown', icon: '❓', color: '#666' };
  const destinationChain = CHAIN_INFO[8453] || { name: 'Base', icon: '🔵', color: '#0052FF' };

  // Format execution time
  const executionMinutes = Math.ceil(route.executionDuration / 60);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white border-[4px] border-black shadow-[8px_8px_0px_#000] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-acid-lime border-b-[4px] border-black p-4 flex items-center justify-between sticky top-0 z-10">
          <h2 className="font-headline text-2xl uppercase tracking-wide">⚡ Bridge Funds</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-black hover:text-white transition-colors border-[2px] border-black"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Route Summary Card */}
          {(modalState === 'idle' || modalState === 'ready') && (
            <>
              <div className="bg-gradient-to-br from-[#CCFF00] to-[#FFD600] p-6 border-[3px] border-black shadow-[4px_4px_0px_#000]">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs font-mono bg-white px-3 py-1.5 border-[2px] border-black shadow-[2px_2px_0px_#000] font-bold">
                    AI RECOMMENDED
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Route Visualization */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="bg-white border-[2px] border-black p-3 shadow-[2px_2px_0px_#000]">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{sourceChain.icon}</span>
                          <div>
                            <p className="font-mono text-xs font-bold uppercase opacity-60">From</p>
                            <p className="font-headline text-lg">{sourceChain.name}</p>
                            <p className="font-mono text-sm font-bold">{route.sourceToken}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-2xl font-bold">→</div>

                    <div className="flex-1">
                      <div className="bg-white border-[2px] border-black p-3 shadow-[2px_2px_0px_#000]">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{destinationChain.icon}</span>
                          <div>
                            <p className="font-mono text-xs font-bold uppercase opacity-60">To</p>
                            <p className="font-headline text-lg">{destinationChain.name}</p>
                            <p className="font-mono text-sm font-bold">USDC</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Route Details */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white border-[2px] border-black p-3">
                      <p className="font-mono text-xs uppercase opacity-60 mb-1">Amount</p>
                      <p className="font-mono font-bold">{amount} USDC</p>
                    </div>
                    <div className="bg-white border-[2px] border-black p-3">
                      <p className="font-mono text-xs uppercase opacity-60 mb-1">Est. Time</p>
                      <p className="font-mono font-bold">~{executionMinutes} min</p>
                    </div>
                    <div className="bg-white border-[2px] border-black p-3">
                      <p className="font-mono text-xs uppercase opacity-60 mb-1">Gas Cost</p>
                      <p className="font-mono font-bold">${parseFloat(route.gasCostUsd).toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Bridge Tool */}
                  <div className="bg-white/80 border-[2px] border-black p-2">
                    <p className="font-mono text-xs">
                      <span className="opacity-60">Via:</span> <span className="font-bold">{route.tool}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Info Banner */}
              <div className="bg-blue-50 border-[2px] border-black p-4">
                <p className="font-mono text-sm">
                  💡 <span className="font-bold">Pro Tip:</span> Funds will be bridged to your wallet on Base. You'll need USDC + ETH for gas before deploying contracts.
                </p>
              </div>
            </>
          )}

          {/* Error Display */}
          {error && (
            <StatusBanner variant="error" onDismiss={() => setError(null)}>
              {error}
            </StatusBanner>
          )}

          {/* Executing State - Show LiFi Bridge Step */}
          {modalState === 'executing' && connectedAddress && (
            <div className="space-y-4">
              <h3 className="font-headline text-xl uppercase">Bridging Funds...</h3>
              <LiFiBridgeStep
                destinationAddress={walletAddress}
                amount={amountBigInt}
                onBridgeStarted={handleBridgeStarted}
                onBridgeCompleted={handleBridgeCompleted}
                onError={handleError}
                preselectedRoute={{
                  sourceChainId: route.sourceChainId,
                  sourceTokenAddress: route.sourceTokenAddress,
                  sourceToken: route.sourceToken,
                  tool: route.tool,
                }}
                autoExecute={true}
              />
            </div>
          )}

          {/* Completed State */}
          {modalState === 'completed' && (
            <div className="bg-acid-lime border-[3px] border-black p-8 text-center shadow-[4px_4px_0px_#000]">
              <div className="text-6xl mb-4">✓</div>
              <h3 className="font-headline text-2xl uppercase mb-2">Bridge Started!</h3>
              <p className="font-display text-sm mb-6">
                Your funds are on the way to Base. You can deploy your contract once the bridge completes (~{Math.ceil(route.executionDuration / 60)} min).
              </p>
              <button
                onClick={handleClose}
                className="bg-black text-white font-mono uppercase px-6 py-3 border-[3px] border-black hover:bg-gray-800 transition-colors"
              >
                Continue
              </button>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {(modalState === 'idle' || modalState === 'ready' || modalState === 'error') && (
          <div className="border-t-[4px] border-black p-4 bg-paper-cream flex gap-3">
            <button
              onClick={handleBridgeNow}
              disabled={!connectedAddress}
              className="flex-1 bg-black text-white font-mono uppercase px-6 py-3 border-[3px] border-black hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Bridge Now
            </button>
            <button
              onClick={handleSkip}
              className="flex-1 bg-white text-black font-mono uppercase px-6 py-3 border-[3px] border-black hover:bg-gray-100 transition-colors"
            >
              Skip for Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
