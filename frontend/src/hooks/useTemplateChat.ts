'use client';

import { useChat } from '@ai-sdk/react';
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
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
  
  // Get connected wallet address
  const { address: walletAddress } = useAccount();

  // Active template is manual selection or AI detection
  const activeTemplate = manualTemplate || detectedTemplate;

  const { messages, setMessages, status } = useChat({
    api: '/api/chat',
    body: {
      templateId: activeTemplate?.id,
      timezone, // Pass timezone to API
      walletAddress, // Pass connected wallet address
    },
  });

  const isLoading = status !== 'ready';

  // Helper to extract text from message content
  const getMessageText = (message: typeof messages[number]) => {
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
    return '';
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

  const handleInputChange = (value: string) => {
    setInput(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input;
    setInput(''); // Clear input immediately

    // Add user message to the messages array
    const newUserMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: userMessage,
    };
    
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);

    // Call the API to get AI response
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          templateId: activeTemplate?.id,
          timezone, // Pass timezone for temporal context
          walletAddress, // Pass wallet address
        }),
      });

      if (!response.ok || !response.body) {
        const errorText = await response.text();
        console.error('Chat API error:', errorText);
        throw new Error('Chat API failed');
      }

      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      const assistantId = (Date.now() + 1).toString();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6); // Remove 'data: ' prefix
            
            // Skip [DONE] marker
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              
              // Handle text delta chunks
              if (parsed.type === 'text-delta' && parsed.delta) {
                assistantMessage += parsed.delta;
                
                // Update messages with streaming content
                setMessages([
                  ...updatedMessages,
                  {
                    id: assistantId,
                    role: 'assistant' as const,
                    content: assistantMessage,
                  },
                ]);
              }
            } catch (e) {
              // Skip invalid JSON
              console.warn('Failed to parse streaming chunk:', data);
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
    }
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
    setInput('');
    // Note: useChat doesn't expose a reset method, so we rely on page navigation
  };

  const isConfigComplete = configCompleteness === 100;

  return {
    // Chat state
    messages,
    input,
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
  };
}
