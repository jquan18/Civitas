'use client';

interface ChatBubbleProps {
  role: 'user' | 'agent';
  message: string;
  timestamp?: string;
}

export function ChatBubble({ role, message, timestamp }: ChatBubbleProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`relative max-w-[80%] px-4 py-3 border-[3px] border-black ${
          isUser
            ? 'bg-hot-pink ml-auto bubble-tip-right shadow-[2px_2px_0px_#000]'
            : 'bg-stark-white mr-auto bubble-tip-left shadow-[2px_2px_0px_#000]'
        }`}
      >
        <p
          className={`text-sm whitespace-pre-wrap ${
            isUser ? 'font-bold text-black' : 'font-display text-black'
          }`}
        >
          {message}
        </p>
        {timestamp && (
          <span className="block mt-1 text-xs opacity-60">{timestamp}</span>
        )}
      </div>
    </div>
  );
}
