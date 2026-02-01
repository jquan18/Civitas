import { useChat } from 'ai/react';
import { useState, useEffect } from 'react';
import type { RentalConfig } from '@/lib/ai/schemas';

export function useRentalChat() {
  const [config, setConfig] = useState<Partial<RentalConfig>>({});
  const [isExtracting, setIsExtracting] = useState(false);

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
  });

  // Auto-extract config after each AI response
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant' && !isLoading) {
      extractConfig();
    }
  }, [messages, isLoading]);

  const extractConfig = async () => {
    if (messages.length === 0) return;

    setIsExtracting(true);
    try {
      const response = await fetch('/api/extract-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      });

      if (response.ok) {
        const extractedConfig = await response.json();
        setConfig(extractedConfig);
      }
    } catch (error) {
      console.error('Failed to extract config:', error);
    } finally {
      setIsExtracting(false);
    }
  };

  const isConfigComplete = Boolean(
    config.tenant && config.monthlyAmount && config.totalMonths
  );

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    config,
    isConfigComplete,
    isExtracting,
  };
}
