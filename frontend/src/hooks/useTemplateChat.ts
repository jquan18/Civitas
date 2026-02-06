'use client';

import { useChat } from '@ai-sdk/react';
import { useState, useEffect } from 'react';
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

  const chatResult = useChat({
    api: '/api/chat',
    body: {
      templateId: activeTemplate?.id,
      timezone, // Pass timezone to API
      walletAddress, // Pass connected wallet address
      chainId, // Pass chain ID for network-aware context
    },
  });

  const { messages, setMessages, handleSubmit, sendMessage, status } = chatResult;

  // Use hook-provided input/setInput if available, otherwise use local state
  const input = chatResult.input ?? localInput;
  const setInput = chatResult.setInput ?? setLocalInput;
  const handleInputChange = chatResult.handleInputChange ?? ((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalInput(e.target.value);
  });

  // In AI SDK v6, sendMessage replaces append
  // Create wrapper to match the old append API for backward compatibility
  const append = async (message: { role: string; content: string }) => {
    // Force fresh body with latest state
    const requestBody = {
      templateId: activeTemplate?.id,
      timezone,
      walletAddress,
      chainId,
    };

    if (chatResult.append) {
      console.log('[useTemplateChat] Appending with explicit body:', requestBody);
      return chatResult.append(message, { body: requestBody });
    }

    if (sendMessage) {
      console.log('[useTemplateChat] Sending message with explicit body fallback:', requestBody);
      // @ts-ignore - Try passing options if supported, though types might conflict
      return sendMessage({ text: message.content }, { body: requestBody });
    }
    throw new Error('No send method available (append/sendMessage missing)');
  };

  const isLoading = status !== 'ready';

  // Helper to extract text from message content
  const getMessageText = (message: typeof messages[number]) => {
    console.log('[getMessageText] message structure:', {
      hasContent: !!message.content,
      contentType: typeof message.content,
      isArray: Array.isArray(message.content),
      hasParts: !!(message as any).parts,
      partsType: typeof (message as any).parts,
    });

    if (typeof message.content === 'string') {
      return message.content;
    }
    // Handle array of content parts
    if (Array.isArray(message.content)) {
      return message.content
        .filter(part => part.type === 'text')
        .map(part => part.text)
        .join(' ');
    }
    // AI SDK v6: Handle parts array at message level
    if (Array.isArray((message as any).parts)) {
      return (message as any).parts
        .filter((part: any) => part.type === 'text')
        .map((part: any) => part.text)
        .join(' ');
    }
    return '';
  };

  // Auto-detect template from first user message
  useEffect(() => {
    if (messages.length > 0 && !detectedTemplate && !manualTemplate) {
      console.log('[Auto-detect] Starting detection, messages:', messages.length);
      const userMessages = messages.filter(m => m.role === 'user');
      console.log('[Auto-detect] User messages:', userMessages.length);

      if (userMessages.length > 0) {
        console.log('[Auto-detect] First user message:', userMessages[0]);
        const firstUserMessageText = getMessageText(userMessages[0]);
        console.log('[Auto-detect] Extracted text:', firstUserMessageText);

        const detected = templateRegistry.detectFromIntent(firstUserMessageText);
        console.log('[Auto-detect] Detection result:', detected?.id || 'null');

        if (detected) {
          console.log('Auto-detected template:', detected.id);
          setDetectedTemplate(detected);
        } else {
          console.log('[Auto-detect] No template matched for text:', firstUserMessageText);
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
