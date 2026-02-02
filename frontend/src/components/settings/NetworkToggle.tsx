'use client';

import { useState } from 'react';
import { useSwitchChain } from 'wagmi';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

interface NetworkToggleProps {
  currentNetwork: 'mainnet' | 'testnet';
  onToggle: (newMode: 'mainnet' | 'testnet') => Promise<void>;
  isLoading: boolean;
}

export default function NetworkToggle({ currentNetwork, onToggle, isLoading }: NetworkToggleProps) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingNetwork, setPendingNetwork] = useState<'mainnet' | 'testnet' | null>(null);
  const { switchChain } = useSwitchChain();

  const handleToggleClick = () => {
    const newMode = currentNetwork === 'mainnet' ? 'testnet' : 'mainnet';
    setPendingNetwork(newMode);
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    if (!pendingNetwork) return;

    setShowConfirmation(false);

    try {
      // Update settings in Supabase
      await onToggle(pendingNetwork);

      // Update localStorage for instant UI
      localStorage.setItem('civitas_network_mode', pendingNetwork);

      // Switch chain via wagmi
      const targetChainId = pendingNetwork === 'mainnet' ? 8453 : 84532;
      await switchChain({ chainId: targetChainId });

      // Reload app to ensure clean state
      window.location.reload();
    } catch (error) {
      console.error('Failed to switch network:', error);
      alert('Failed to switch network. Please try again.');
    } finally {
      setPendingNetwork(null);
    }
  };

  const handleCancel = () => {
    setShowConfirmation(false);
    setPendingNetwork(null);
  };

  return (
    <>
      <div className="p-6 bg-stark-white border-4 border-black shadow-[8px_8px_0px_#000]">
        <h3 className="font-headline text-xl uppercase mb-4">Network Mode</h3>

        <div className="space-y-4">
          {/* Current Network Badge */}
          <div className="flex items-center justify-between">
            <span className="font-display font-bold text-sm">Current Network:</span>
            <span
              className={`${
                currentNetwork === 'mainnet'
                  ? 'bg-acid-lime text-black'
                  : 'bg-warning-yellow text-black'
              } px-3 py-1 text-xs font-headline uppercase border-2 border-black`}
            >
              {currentNetwork.toUpperCase()}
            </span>
          </div>

          {/* Toggle Button */}
          <button
            onClick={handleToggleClick}
            disabled={isLoading}
            className={`w-full bg-hot-pink text-white border-2 border-black px-6 py-4 font-display font-bold uppercase shadow-[4px_4px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-200 cursor-pointer ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isLoading
              ? 'Switching...'
              : `Switch to ${currentNetwork === 'mainnet' ? 'Testnet' : 'Mainnet'}`}
          </button>

          {/* Warning Message */}
          <div className="p-4 bg-warning-yellow border-2 border-black">
            <p className="font-display text-xs uppercase font-bold mb-1">⚠️ Warning</p>
            <p className="font-display text-xs">
              Switching networks will reload the app and switch all contract interactions to{' '}
              {currentNetwork === 'mainnet' ? 'Base Sepolia testnet' : 'Base mainnet'}.
            </p>
          </div>

          {/* Network Info */}
          <div className="text-xs font-display text-gray-600 space-y-1">
            <p>
              <span className="font-bold">Mainnet:</span> Base (Chain ID: 8453)
            </p>
            <p>
              <span className="font-bold">Testnet:</span> Base Sepolia (Chain ID: 84532)
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmation}
        title="Switch Network?"
        message={`This will switch to ${pendingNetwork?.toUpperCase()} mode and reload the app. All contract interactions will use the new network. Are you sure?`}
        confirmText="Switch Network"
        cancelText="Cancel"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        isDestructive={true}
      />
    </>
  );
}
