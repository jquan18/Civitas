'use client';

import { useAccount } from 'wagmi';
import { useEffect, useState } from 'react';
import { NeoBrutalistConnectButton } from '@/components/wallet/NeoBrutalistConnectButton';
import { Wallet, AlertTriangle } from 'lucide-react';
import HardShadowCard from '@/components/ui/HardShadowCard';

interface WalletGateProps {
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

export function WalletGate({
  children,
  fallbackTitle = 'Wallet Required',
  fallbackMessage = 'Connect your wallet to access this feature',
}: WalletGateProps) {
  const { isConnected, isConnecting } = useAccount();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen bg-paper-cream flex items-center justify-center p-4">
        <div className="animate-pulse bg-stark-white border-4 border-black shadow-[8px_8px_0px_#000] p-12 w-full max-w-md h-64" />
      </div>
    );
  }

  // Show loading state while connecting
  if (isConnecting) {
    return (
      <div className="min-h-screen bg-paper-cream flex items-center justify-center p-4">
        <HardShadowCard className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <Wallet className="w-16 h-16 text-black animate-pulse" />
            <p className="font-headline text-2xl uppercase text-black">Connecting...</p>
          </div>
        </HardShadowCard>
      </div>
    );
  }

  // Show wallet connection prompt if not connected
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-paper-cream flex items-center justify-center p-4">
        {/* Background Pattern */}
        <div className="absolute inset-0 pattern-grid pointer-events-none opacity-30" />

        {/* Connection Prompt Card */}
        <div className="relative z-10 w-full max-w-2xl">
          {/* Warning Banner */}
          <div className="bg-warning-yellow border-4 border-black shadow-[8px_8px_0px_#000] p-4 mb-6 flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-black shrink-0" strokeWidth={3} />
            <p className="font-display font-bold uppercase text-sm text-black">
              ⚠️ Wallet Connection Required to Continue
            </p>
          </div>

          {/* Main Card */}
          <HardShadowCard className="p-8 md:p-12">
            <div className="text-center space-y-6">
              {/* Icon */}
              <div className="flex justify-center">
                <div className="bg-acid-lime border-4 border-black p-6 shadow-[4px_4px_0px_#000]">
                  <Wallet className="w-16 h-16 text-black" strokeWidth={3} />
                </div>
              </div>

              {/* Title */}
              <h2 className="font-headline text-4xl uppercase tracking-tight text-black">
                {fallbackTitle}
              </h2>

              {/* Message */}
              <p className="font-display text-lg max-w-md mx-auto text-black">
                {fallbackMessage}
              </p>

              {/* Connect Button */}
              <div className="pt-6">
                <NeoBrutalistConnectButton />
              </div>

              {/* Help Text */}
              <div className="pt-6 border-t-2 border-dashed border-black">
                <p className="font-display text-xs uppercase text-black font-bold mb-2">
                  Why do I need to connect?
                </p>
                <ul className="font-display text-sm text-left max-w-md mx-auto space-y-2 text-black">
                  <li className="flex items-start gap-2">
                    <span className="text-acid-lime font-bold">→</span>
                    <span>Deploy smart contracts to Base L2</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-acid-lime font-bold">→</span>
                    <span>Sign transactions securely</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-acid-lime font-bold">→</span>
                    <span>Manage your rental agreements</span>
                  </li>
                </ul>
              </div>

              {/* Security Note */}
              <div className="bg-stark-white border-2 border-black p-4 text-left">
                <p className="font-display text-xs uppercase font-bold mb-1 text-black">
                  🔒 Secure Connection
                </p>
                <p className="font-display text-xs text-black opacity-75">
                  We never store your private keys. Your wallet stays in your control.
                </p>
              </div>
            </div>
          </HardShadowCard>
        </div>
      </div>
    );
  }

  // Wallet connected - render children
  return <>{children}</>;
}
