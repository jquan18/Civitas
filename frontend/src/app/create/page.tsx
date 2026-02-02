'use client';

import { WalletGate } from '@/components/wallet/WalletGate';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { ContractCard } from '@/components/contract/ContractCard';
import { useRentalChat } from '@/hooks/useRentalChat';
import NavigationRail from '@/components/layout/NavigationRail';
import MarqueeTicker from '@/components/layout/MarqueeTicker';

export default function CreatePage() {
  const { config, isConfigComplete } = useRentalChat();

  return (
    <WalletGate
      fallbackTitle="Connect to Create"
      fallbackMessage="Connect your wallet to start creating rental agreements with AI"
    >
      <div className="min-h-screen bg-paper-cream relative">
        {/* Navigation Rail */}
        <NavigationRail />

        {/* Main Content */}
        <div className="min-h-screen ml-[88px] flex flex-col">
          {/* Marquee Ticker */}
          <MarqueeTicker />

          {/* Page Header */}
          <div className="p-8 pb-4">
            <div className="inline-block bg-acid-lime border-[3px] border-black px-6 py-3 shadow-[4px_4px_0px_#000]">
              <h1 className="font-headline text-2xl uppercase tracking-wide">CREATE AGREEMENT</h1>
            </div>
          </div>

          {/* Split Screen Layout */}
          <div className="flex-1 px-8 pb-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
              {/* Left: Chat Interface */}
              <div className="h-full min-h-[600px]">
                <ChatInterface />
              </div>

              {/* Right: Contract Preview */}
              <div className="lg:sticky lg:top-8 h-fit">
                <ContractCard config={config} isComplete={isConfigComplete} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </WalletGate>
  );
}
