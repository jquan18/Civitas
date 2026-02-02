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
        <h2 className="font-headline text-xl uppercase tracking-wide">COMMAND ZONE</h2>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 relative pattern-grid">
        {messages.length === 0 && (
          <HardShadowCard className="mx-auto max-w-md mt-8">
            <div className="text-center">
              <h3 className="font-headline text-2xl uppercase mb-3">START CHATTING</h3>
              <p className="font-display text-sm">
                Tell me about your rental agreement and I&apos;ll help you create it on-chain.
              </p>
            </div>
          </HardShadowCard>
        )}

        {messages.map((message) => (
          <ChatBubble
            key={message.id}
            role={message.role === 'user' ? 'user' : 'agent'}
            message={getMessageText(message)}
          />
        ))}

        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="bg-stark-white border-[3px] border-black px-6 py-4 shadow-[2px_2px_0px_#000]">
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
