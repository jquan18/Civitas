'use client';

import { Wallet, ArrowLeftRight, Sparkles } from 'lucide-react';

export type FundingMethod = 'direct' | 'lifi';

interface FundingMethodSelectorProps {
  onSelect: (method: FundingMethod) => void;
  showLiFi?: boolean;
}

export default function FundingMethodSelector({ onSelect, showLiFi = true }: FundingMethodSelectorProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-headline text-2xl uppercase text-center mb-6">Choose Funding Method</h3>

      {/* Direct Transfer Option */}
      <button
        onClick={() => onSelect('direct')}
        className="w-full border-[3px] border-black bg-white p-6 shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all group"
      >
        <div className="flex items-start gap-4">
          <div className="bg-acid-lime border-[3px] border-black p-3 group-hover:scale-110 transition-transform">
            <Wallet className="w-8 h-8 text-black" />
          </div>
          <div className="flex-1 text-left">
            <h4 className="font-headline text-xl uppercase mb-2">Direct Transfer</h4>
            <p className="font-display text-sm text-gray-600 mb-2">
              Transfer USDC from your Base wallet to this contract
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="bg-gray-100 px-2 py-1 border border-black font-mono">Instant</span>
              <span className="bg-gray-100 px-2 py-1 border border-black font-mono">Lowest gas fees</span>
              <span className="bg-gray-100 px-2 py-1 border border-black font-mono">Simple</span>
            </div>
          </div>
        </div>
      </button>

      {/* LI.FI Cross-Chain Bridge Option */}
      {showLiFi && (
        <button
          onClick={() => onSelect('lifi')}
          className="w-full border-[3px] border-black bg-white p-6 shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all group"
        >
          <div className="flex items-start gap-4">
            <div className="bg-warning-yellow border-[3px] border-black p-3 group-hover:scale-110 transition-transform">
              <ArrowLeftRight className="w-8 h-8 text-black" />
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-headline text-xl uppercase">Cross-Chain Bridge</h4>
                <span className="inline-flex items-center gap-1 bg-black font-mono text-[10px] uppercase px-2 py-0.5 text-white" style={{ color: 'white' }}>
                  <Sparkles className="w-3 h-3 text-white" />
                  AI Powered
                </span>
              </div>
              <p className="font-display text-sm text-gray-600 mb-2">
                Bridge from any chain using LI.FI with AI route optimization
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="bg-gray-100 px-2 py-1 border border-black font-mono">From 20+ chains</span>
                <span className="bg-gray-100 px-2 py-1 border border-black font-mono">AI route optimization</span>
                <span className="bg-gray-100 px-2 py-1 border border-black font-mono">1-5 minutes</span>
              </div>
            </div>
          </div>
        </button>
      )}

      {!showLiFi && (
        <div className="text-center p-4 bg-gray-100 border-[2px] border-gray-300">
          <p className="font-mono text-xs text-gray-500">
            LI.FI cross-chain bridge is only available on Base Mainnet
          </p>
        </div>
      )}
    </div>
  );
}
