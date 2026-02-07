'use client';

import { Streamdown } from 'streamdown';
import { code } from '@streamdown/code';
import type { UIMessage } from 'ai';
import { isToolUIPart } from 'ai';
import { ToolResultDisplay } from './ToolResultDisplay';

interface ChatBubbleProps {
  message: UIMessage;
  timestamp?: string;
  isLoading?: boolean;
}

/**
 * Extract text content from message parts or content string
 */
function getMessageText(message: UIMessage): string {
  // Cast to any to handle potential content string property not in UIMessage type
  const msg = message as any;
  if (typeof msg.content === 'string') {
    return msg.content;
  }

  if (message.parts) {
    return message.parts
      .filter((part) => part.type === 'text')
      .map((part) => (part as any).text)
      .join('');
  }

  return '';
}

/**
 * Extract tool invocations from message parts
 */
function getToolInvocations(message: UIMessage) {
  if (!message.parts) return [];

  return message.parts.filter((part) => isToolUIPart(part));
}

export function ChatBubble({ message, timestamp, isLoading = false }: ChatBubbleProps) {
  const isUser = message.role === 'user';
  const messageText = getMessageText(message);
  const toolInvocations = getToolInvocations(message);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
      <div className="relative max-w-prose">
        {/* Chat bubble container */}
        <div
          className={`px-6 py-4 border-[3px] border-black break-words ${isUser
            ? 'bg-hot-pink shadow-[3px_3px_0px_#000]'
            : 'bg-stark-white shadow-[3px_3px_0px_#000]'
            }`}
        >
          {isUser ? (
            <p className="text-base font-black text-black leading-relaxed whitespace-pre-wrap">
              {messageText}
            </p>
          ) : (
            <>
              <div className="text-base font-display text-black font-medium leading-relaxed prose-civitas">
                <Streamdown
                  plugins={{ code }}
                  isAnimating={message.role === 'assistant' && isLoading}
                  caret={message.role === 'assistant' && isLoading ? 'block' : undefined}
                >
                  {messageText}
                </Streamdown>
              </div>

              {/* Render tool invocations for assistant messages */}
              {!isUser &&
                toolInvocations.length > 0 &&
                toolInvocations.map((toolInvocation: any, index) => (
                  <ToolResultDisplay key={index} toolInvocation={toolInvocation} />
                ))}
            </>
          )}
          {timestamp && (
            <span className="block mt-2 text-xs font-display text-black opacity-60 uppercase tracking-wide">
              {timestamp}
            </span>
          )}
        </div>

        {/* Notch triangle - positioned absolutely */}
        <div
          className={`absolute ${isUser ? 'bubble-tip-right' : 'bubble-tip-left'}`}
        />
      </div>
    </div>
  );
}
