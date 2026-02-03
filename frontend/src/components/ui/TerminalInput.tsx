'use client';

import { Send } from 'lucide-react';
import { FormEvent } from 'react';

interface TerminalInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export function TerminalInput({
  value,
  onChange,
  onSubmit,
  placeholder = 'Type your message...',
  disabled = false,
}: TerminalInputProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!disabled && value.trim()) {
      onSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-stretch border-[3px] border-black shadow-[4px_4px_0px_#000]">
      {/* Prompt Indicator */}
      <div className="flex items-center justify-center bg-acid-lime px-5 border-r-[3px] border-black">
        <span className="text-black font-black text-2xl leading-none">&gt;</span>
      </div>

      {/* Input Field */}
      <div className="flex-1 relative bg-paper-cream">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full h-full px-5 py-4 bg-transparent font-display text-base font-medium text-black placeholder-gray-400 focus:outline-none disabled:opacity-50"
        />
        {/* Blinking Cursor */}
        {!disabled && value === '' && (
          <span className="absolute right-5 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-black animate-blink" />
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="bg-acid-lime px-7 border-l-[3px] border-black hover:bg-warning-yellow transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        <Send className="w-6 h-6 text-black" strokeWidth={3} />
      </button>
    </form>
  );
}
