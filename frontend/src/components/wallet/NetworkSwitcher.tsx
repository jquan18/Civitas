'use client';

import { useState } from 'react';
import { useSwitchChain, useChainId, useAccount } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { Network, CheckCircle2, AlertCircle, X } from 'lucide-react';

interface NetworkSwitcherProps {
  inline?: boolean;
}

export default function NetworkSwitcher({ inline = false }: NetworkSwitcherProps) {
  const { switchChain } = useSwitchChain();
  const currentChainId = useChainId();
  const { connector } = useAccount();
  const [isSwitching, setIsSwitching] = useState(false);
  const [showManualInstructions, setShowManualInstructions] = useState(false);

  const isOnBaseSepolia = currentChainId === baseSepolia.id;
  const isSmartWallet = connector?.name?.toLowerCase().includes('coinbase') ||
                        connector?.name?.toLowerCase().includes('smart');

  const handleSwitchNetwork = async () => {
    if (!switchChain || isOnBaseSepolia) return;

    try {
      setIsSwitching(true);
      await switchChain({ chainId: baseSepolia.id });
    } catch (error: any) {
      console.error('Failed to switch network:', error);

      // If switch fails (common with smart wallets), show manual instructions
      if (error.message?.includes('does not support') ||
          error.message?.includes('User rejected') ||
          isSmartWallet) {
        setShowManualInstructions(true);
      }
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <>
      <button
        onClick={handleSwitchNetwork}
        disabled={isOnBaseSepolia || isSwitching}
        className={`
          ${inline ? 'relative' : 'fixed top-4 right-4 z-50'}
          flex items-center gap-2
          ${inline ? 'px-3 py-1.5' : 'px-4 py-2'}
          border-2 border-black
          ${inline ? 'shadow-[2px_2px_0px_#000]' : 'shadow-[4px_4px_0px_#000]'}
          font-display font-bold text-sm uppercase
          transition-all
          ${
            isOnBaseSepolia
              ? 'bg-acid-lime text-void-black cursor-default'
              : 'bg-hot-pink text-stark-white hover:shadow-[4px_4px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] cursor-pointer'
          }
          ${isSwitching ? 'opacity-50 cursor-wait' : ''}
        `}
      >
        {isOnBaseSepolia ? (
          <>
            <CheckCircle2 className="w-4 h-4" />
            <span className={inline ? 'hidden sm:inline' : ''}>Base Sepolia</span>
          </>
        ) : (
          <>
            <AlertCircle className="w-4 h-4" />
            <span className={inline ? 'hidden sm:inline' : ''}>{isSwitching ? 'Switching...' : 'Switch Network'}</span>
          </>
        )}
        <Network className="w-4 h-4" />
      </button>

      {/* Manual Instructions Modal */}
      {showManualInstructions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-stark-white border-4 border-black shadow-[8px_8px_0px_#000] p-6 max-w-md w-full">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-headline text-2xl uppercase">Switch Network Manually</h3>
              <button
                onClick={() => setShowManualInstructions(false)}
                className="p-1 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-yellow-50 border-2 border-yellow-500 p-4 mb-4">
              <p className="font-bold text-yellow-700 text-sm mb-2">
                ⚠️ Smart Wallet Detected
              </p>
              <p className="text-sm text-yellow-800">
                Your wallet doesn't support automatic network switching. Please switch manually.
              </p>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <p className="font-bold mb-2">📱 For Coinbase Smart Wallet:</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-700">
                  <li>Open the Coinbase Wallet app</li>
                  <li>Tap the network selector at the top</li>
                  <li>Select "Base Sepolia" from the list</li>
                  <li>Return to this page and refresh</li>
                </ol>
              </div>

              <div className="pt-3 border-t-2 border-dashed border-black">
                <p className="font-bold mb-1">Current Network:</p>
                <p className="text-red-600 font-mono text-xs">
                  {currentChainId === 8453 ? 'Base Mainnet (8453)' : `Chain ID: ${currentChainId}`}
                </p>
              </div>

              <div>
                <p className="font-bold mb-1">Required Network:</p>
                <p className="text-green-600 font-mono text-xs">
                  Base Sepolia (84532)
                </p>
              </div>

              <div className="bg-blue-50 border-2 border-blue-500 p-3 mt-4">
                <p className="text-xs text-blue-800">
                  <strong>💡 Tip:</strong> After switching, you may need to refresh the page for changes to take effect.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowManualInstructions(false)}
              className="w-full mt-4 border-2 border-black bg-acid-lime px-4 py-2 font-bold hover:bg-lime-400"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
}
