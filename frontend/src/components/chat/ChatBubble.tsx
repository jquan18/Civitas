'use client';

interface ChatBubbleProps {
  role: 'user' | 'agent';
  message: string;
  timestamp?: string;
}

export function ChatBubble({ role, message, timestamp }: ChatBubbleProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
      <div
        className={`relative max-w-[75%] px-6 py-4 border-[3px] border-black ${
          isUser
            ? 'bg-hot-pink ml-auto bubble-tip-right shadow-[3px_3px_0px_#000]'
            : 'bg-stark-white mr-auto bubble-tip-left shadow-[3px_3px_0px_#000]'
        }`}
      >
        <p
          className={`whitespace-pre-wrap leading-relaxed ${
            isUser 
              ? 'text-base font-black text-black' 
              : 'text-base font-display text-black font-medium'
          }`}
        >
          {message}
        </p>
        {timestamp && (
          <span className="block mt-2 text-xs font-display text-black opacity-60 uppercase tracking-wide">
            {timestamp}
          </span>
        )}
      </div>
    </div>
  );
}
