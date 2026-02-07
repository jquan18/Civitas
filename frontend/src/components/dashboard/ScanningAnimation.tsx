'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

export interface ScanProgress {
  step: 'wallet' | 'routes' | 'comparing';
  message: string;
  chainsScanned?: number;
  tokensFound?: number;
  routesCalculated?: number;
}

interface ScanningAnimationProps {
  progress: ScanProgress;
  onSkip: () => void;
}

const WALLET_MESSAGES = [
  'Scanning your wallet across 5 chains...',
  'Checking Ethereum, Base, Arbitrum, Optimism, Polygon...',
  'Looking for USDC and ETH balances...',
];

const ROUTES_MESSAGES = [
  'Calculating optimal routes via LI.FI...',
  'Comparing bridge providers...',
  'Analyzing gas costs and execution times...',
];

const COMPARING_MESSAGES = [
  'Ranking by gas cost and speed...',
  'Selecting best option...',
  'Almost there...',
];

export default function ScanningAnimation({ progress, onSkip }: ScanningAnimationProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [displayMessage, setDisplayMessage] = useState(progress.message);

  // Rotate through messages every 2 seconds for engagement
  useEffect(() => {
    let messages: string[] = [];

    switch (progress.step) {
      case 'wallet':
        messages = WALLET_MESSAGES;
        break;
      case 'routes':
        messages = ROUTES_MESSAGES;
        break;
      case 'comparing':
        messages = COMPARING_MESSAGES;
        break;
    }

    setMessageIndex(0);
    setDisplayMessage(progress.message || messages[0]);

    const interval = setInterval(() => {
      setMessageIndex((prev) => {
        const next = (prev + 1) % messages.length;
        setDisplayMessage(messages[next]);
        return next;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [progress.step, progress.message]);

  return (
    <div className="animate-in fade-in zoom-in duration-300">
      <div className="mb-6 text-center">
        <h3 className="font-headline text-xl uppercase mb-2">Civitas AI Advisor</h3>
        <p className="font-display text-sm text-gray-600">
          Finding the best route for your funds...
        </p>
      </div>

      {/* Animated Spinner with Chain Icons */}
      <div className="relative flex items-center justify-center h-32 mb-6">
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-16 h-16 text-[#CCFF00] animate-spin" strokeWidth={3} />
        </div>
        <div className="relative z-10 bg-white border-[3px] border-black p-4 shadow-[4px_4px_0px_#000]">
          <div className="text-2xl">🔍</div>
        </div>
      </div>

      {/* Progress Messages */}
      <div className="bg-gray-100 border-[3px] border-black p-4 mb-4 min-h-[80px]">
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <p className="font-mono text-sm text-center mb-2">{displayMessage}</p>

          {progress.chainsScanned !== undefined && (
            <p className="text-xs text-gray-600 text-center">
              Scanned {progress.chainsScanned} chains
            </p>
          )}

          {progress.tokensFound !== undefined && progress.tokensFound > 0 && (
            <p className="text-xs text-[#CCFF00] bg-black px-2 py-1 inline-block font-bold text-center w-full">
              Found {progress.tokensFound} tokens!
            </p>
          )}

          {progress.routesCalculated !== undefined && progress.routesCalculated > 0 && (
            <p className="text-xs text-[#CCFF00] bg-black px-2 py-1 inline-block font-bold text-center w-full">
              Found {progress.routesCalculated} routes!
            </p>
          )}
        </div>
      </div>

      {/* Skip to Manual Link */}
      <div className="text-center">
        <button
          onClick={onSkip}
          className="text-xs text-gray-500 underline hover:text-black transition-colors"
        >
          Skip to manual setup
        </button>
      </div>
    </div>
  );
}
