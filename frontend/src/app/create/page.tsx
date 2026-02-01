'use client';

import { ChatInterface } from '@/components/chat/ChatInterface';
import { ContractCard } from '@/components/contract/ContractCard';
import { useRentalChat } from '@/hooks/useRentalChat';

export default function CreatePage() {
  const { config, isConfigComplete } = useRentalChat();

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-zinc-900">Create Rental Agreement</h1>
        </div>
      </header>

      {/* Split Screen Layout */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-12rem)]">
          {/* Left: Chat Interface */}
          <div className="bg-white rounded-lg shadow-sm border border-zinc-200 overflow-hidden">
            <ChatInterface />
          </div>

          {/* Right: Contract Preview */}
          <div className="sticky top-8 h-fit">
            <ContractCard config={config} isComplete={isConfigComplete} />
          </div>
        </div>
      </div>
    </div>
  );
}
