'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useEffect } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { templateRegistry } from '@/lib/templates/registry';
import type { TemplateDefinition } from '@/lib/templates/types';
import { useUserTimezone } from './useUserTimezone';

export function useTemplateChat() {
  const [detectedTemplate, setDetectedTemplate] = useState<TemplateDefinition | null>(null);
  const [manualTemplate, setManualTemplate] = useState<TemplateDefinition | null>(null);
  const [extractedConfig, setExtractedConfig] = useState<any>({});
  const [configCompleteness, setConfigCompleteness] = useState(0);
  const [isExtracting, setIsExtracting] = useState(false);
  const [input, setInput] = useState('');

  // Detect user's timezone from browser
  const timezone = useUserTimezone();

  // Get connected wallet address and chain ID
  const { address: walletAddress } = useAccount();
  const chainId = useChainId();

  // Active template is manual selection or AI detection
  const activeTemplate = manualTemplate || detectedTemplate;

  const { messages, setMessages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: {
        templateId: activeTemplate?.id,
        timezone, // Pass timezone to API
        walletAddress, // Pass connected wallet address
        chainId, // Pass chain ID for network-aware ENS defaults
      },
    }),
  });

  const isLoading = status !== 'ready';

  // Custom wrapper to bridge TerminalInput's (value: string) => void signature
  // with the string state management. TerminalInput extracts e.target.value
  // and passes the string to this function.
  const handleInputChange = (value: string) => {
    setInput(value);
  };

  const handleSubmit = () => {
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput('');
  };

  // Helper to extract text from message parts
  const getMessageText = (message: typeof messages[number]) => {
    return message.parts
      .filter(part => part.type === 'text')
      .map(part => (part as any).text)
      .join(' ');
  };

  // Auto-detect template from first user message
  useEffect(() => {
    if (messages.length > 0 && !detectedTemplate && !manualTemplate) {
      const userMessages = messages.filter(m => m.role === 'user');
      if (userMessages.length > 0) {
        const firstUserMessageText = getMessageText(userMessages[0]);
        const detected = templateRegistry.detectFromIntent(firstUserMessageText);
        if (detected) {
          console.log('Auto-detected template:', detected.id);
          setDetectedTemplate(detected);
        }
      }
    }
  }, [messages, detectedTemplate, manualTemplate]);

  // Auto-extract config after each AI response
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant' && !isLoading && activeTemplate) {
      extractConfig();
    }
  }, [messages, isLoading, activeTemplate]);

  const extractConfig = async () => {
    if (messages.length === 0 || !activeTemplate) return;

    // Only extract if there are at least 2+ exchanges (4+ messages)
    if (messages.length < 4) {
      console.log('Skipping extraction: insufficient conversation data');
      return;
    }

    setIsExtracting(true);
    try {
      const response = await fetch('/api/extract-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          templateId: activeTemplate.id,
          timezone, // Pass timezone for date conversion
          walletAddress, // Pass wallet address for auto-fill
          chainId, // Pass chain ID for network-aware ENS defaults
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setExtractedConfig(data.config || {});
        setConfigCompleteness(data.completeness || 0);
      }
    } catch (error) {
      console.error('Failed to extract config:', error);
      // Don't throw - silently fail for UX
    } finally {
      setIsExtracting(false);
    }
  };

  // Helper functions for extracting tool data from messages
  const getMessageToolCalls = (message: typeof messages[number]) => {
    return message.parts.filter((part: any) => part.type === 'tool-call');
  };

  const getMessageToolResults = (message: typeof messages[number]) => {
    return message.parts.filter((part: any) => part.type === 'tool-result');
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templateRegistry.get(templateId);
    if (template) {
      console.log('Manually selected template:', templateId);
      setManualTemplate(template);
      setDetectedTemplate(null); // Clear auto-detection
    }
  };

  const resetChat = () => {
    setDetectedTemplate(null);
    setManualTemplate(null);
    setExtractedConfig({});
    setConfigCompleteness(0);
    setMessages([]);
  };

  const isConfigComplete = configCompleteness === 100;

  return {
    // Chat state
    messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    isLoading,

    // Template state
    detectedTemplate,
    manualTemplate,
    activeTemplate,
    handleTemplateSelect,

    // Config state
    extractedConfig,
    configCompleteness,
    isConfigComplete,
    isExtracting,

    // Actions
    resetChat,

    // Helpers
    getMessageText,
    getMessageToolCalls,
    getMessageToolResults,
  };
}
