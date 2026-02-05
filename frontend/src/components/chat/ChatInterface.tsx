'use client';

import { useRentalChat } from '@/hooks/useRentalChat';
import { ChatBubble } from './ChatBubble';
import { TerminalInput } from '@/components/ui/TerminalInput';
import { LoadingSquares } from '@/components/ui/LoadingSquares';
import HardShadowCard from '@/components/ui/HardShadowCard';

export function ChatInterface() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useRentalChat();

  // Helper to extract text content from message parts
  const getMessageText = (message: typeof messages[number]) => {
    return message.parts
      .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
      .map((part) => part.text)
      .join('');
  };

  const onSubmit = () => {
    handleSubmit(new Event('submit') as any);
  };

  return (
    <div className="flex flex-col h-full bg-stark-white border-[3px] border-black shadow-[4px_4px_0px_#000]">
      {/* Header */}
      <div className="bg-warning-yellow border-b-[3px] border-black px-6 py-3 shrink-0">
        <h2 className="font-headline text-xl uppercase tracking-wide text-black">COMMAND ZONE</h2>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-8 relative pattern-grid">
        {messages.length === 0 && (
          <HardShadowCard className="mx-auto max-w-lg mt-12 relative z-10 p-8">
            <div className="text-center space-y-4">
              <h3 className="font-headline text-3xl uppercase text-black leading-tight">START CHATTING</h3>
              <p className="font-display text-base text-black leading-relaxed">
                Tell me about your rental agreement and I&apos;ll help you create it on-chain.
              </p>
            </div>
          </HardShadowCard>
        )}

        {messages.map((message, index) => {
          const isLastMessage = index === messages.length - 1;
          return (
            <div key={message.id} className="relative z-10">
              <ChatBubble
                message={message}
                isLoading={isLoading && isLastMessage && message.role === 'assistant'}
              />
            </div>
          );
        })}

        {isLoading && (
          <div className="flex justify-start mb-6 relative z-10">
            <div className="bg-stark-white border-[3px] border-black px-6 py-5 shadow-[3px_3px_0px_#000]">
              <LoadingSquares size="md" />
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t-[3px] border-black p-4 bg-paper-cream shrink-0">
        <TerminalInput
          value={input}
          onChange={handleInputChange}
          onSubmit={onSubmit}
          placeholder="Describe your rental agreement..."
          disabled={isLoading}
        />
      </div>
    </div>
  );
}
