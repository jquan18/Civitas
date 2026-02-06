'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useEffect, useMemo } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { templateRegistry } from '@/lib/templates/registry';
import type { TemplateDefinition } from '@/lib/templates/types';
import { useUserTimezone } from './useUserTimezone';

// Define message type
type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export function useTemplateChat() {
  const [detectedTemplate, setDetectedTemplate] = useState<TemplateDefinition | null>(null);
  const [manualTemplate, setManualTemplate] = useState<TemplateDefinition | null>(null);
  const [extractedConfig, setExtractedConfig] = useState<any>({});
  const [configCompleteness, setConfigCompleteness] = useState(0);
  const [isExtracting, setIsExtracting] = useState(false);

  // Detect user's timezone from browser
  const timezone = useUserTimezone();

  // Get connected wallet address
  const { address: walletAddress } = useAccount();
  const chainId = useChainId();

  // Active template is manual selection or AI detection
  const activeTemplate = manualTemplate || detectedTemplate;

  // Manual input state management (as fallback for v6 compatibility)
  const [localInput, setLocalInput] = useState('');

  // Debug logging for wallet address
  useEffect(() => {
    console.log('[useTemplateChat] Wallet Address changed:', walletAddress);
    console.log('[useTemplateChat] Active Template:', activeTemplate?.id);
  }, [walletAddress, activeTemplate]);

  // Create transport with dynamic body that updates with dependencies
  const transport = useMemo(() => {
    return new DefaultChatTransport({
      api: '/api/chat',
      body: {
        templateId: activeTemplate?.id,
        timezone,
        walletAddress,
        chainId,
      },
    });
  }, [activeTemplate?.id, timezone, walletAddress, chainId]);

  const chatResult = useChat({
    transport,
  });

  const { messages, setMessages, sendMessage, status } = chatResult;

  // Manual input/handleSubmit for v6 compatibility
  const input = localInput;
  const setInput = setLocalInput;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalInput(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localInput.trim()) {
      sendMessage({ text: localInput });
      setLocalInput('');
    }
  };

  // In AI SDK v6, sendMessage replaces append
  // Create wrapper to match the old append API for backward compatibility
  const append = async (message: { role: string; content: string }) => {
    // Force fresh body with latest state to ensure wallet/template context is current
    const requestBody = {
      templateId: activeTemplate?.id,
      timezone,
      walletAddress,
      chainId,
    };

    console.log('[useTemplateChat] Appending with explicit body:', requestBody);

    if (sendMessage) {
      // @ts-ignore - Valid at runtime for standard chat providers, bypassing strict type defs if they lag
      return sendMessage({ text: message.content }, { body: requestBody });
    }
    throw new Error('sendMessage not available');
  };

  const isLoading = status !== 'ready';

  // Helper to extract text from message content
  const getMessageText = (message: typeof messages[number]) => {
    console.log('[getMessageText] message structure:', {
      hasParts: !!message.parts,
      partsType: typeof message.parts,
      partsLength: Array.isArray(message.parts) ? message.parts.length : 0,
    });

    // AI SDK v6: Messages use parts array
    if (Array.isArray(message.parts)) {
      return message.parts
        .filter((part: any) => part.type === 'text')
        .map((part: any) => part.text)
        .join(' ');
    }
    return '';
  };

  // Auto-detect template from user messages
  useEffect(() => {
    if (messages.length > 0 && !detectedTemplate && !manualTemplate) {
      const userMessages = messages.filter(m => m.role === 'user');

      if (userMessages.length > 0) {
        // Check the latest user message for intent
        const lastUserMessage = userMessages[userMessages.length - 1];
        const lastUserMessageText = getMessageText(lastUserMessage);
        console.log('[Auto-detect] Checking latest user message:', lastUserMessageText);

        const detected = templateRegistry.detectFromIntent(lastUserMessageText);

        if (detected) {
          console.log('[Auto-detect] Detected template:', detected.id);
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
    append,

    // Helpers
    getMessageText,
    getMessageToolCalls,
    getMessageToolResults,
  };
}
