'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useChainId, useAccount } from 'wagmi';
import { WalletGate } from '@/components/wallet/WalletGate';
import { useTemplateChat } from '@/hooks/useTemplateChat';
import { useCivitasContractDeploy } from '@/hooks/useCivitasContractDeploy';
import { templateRegistry } from '@/lib/templates/registry';
import { TemplateSelector } from '@/components/chat/TemplateSelector';
import { ContractReceiptCard } from '@/components/contract/ContractReceiptCard';
import { StatusBanner } from '@/components/ui/StatusBanner';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { TerminalInput } from '@/components/ui/TerminalInput';
import { LoadingSquares } from '@/components/ui/LoadingSquares';
import NavigationRail from '@/components/layout/NavigationRail';
import MarqueeTicker from '@/components/layout/MarqueeTicker';
import {
  transformConfigToDeployParams,
  validateConfig,
  resolveConfigENSNames,
  resolveMeReferences,
  type ENSResolutionReport
} from '@/lib/contracts/config-transformer';
import { CONTRACT_TEMPLATES, getCivitasEnsDomain, type ContractTemplate } from '@/lib/contracts/constants';
import { isENSName, formatAddress } from '@/lib/ens/resolver';
import { LiFiBridgeStep, DirectFundingStep, BalancePoller } from '@/components/deploy';
import { isLiFiSupported, LIFI_SUPPORTED_CHAIN_IDS } from '@/lib/lifi';

export default function CreatePage() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chainId = useChainId();
  const { address: walletAddress } = useAccount();
  const ensDomain = getCivitasEnsDomain(chainId);
  const {
    messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    isLoading,
    detectedTemplate,
    activeTemplate,
    handleTemplateSelect,
    extractedConfig,
    configCompleteness,
    isConfigComplete,
    getMessageText,
    append,
  } = useTemplateChat();

  const {
    deployContract,
    isPending,
    isConfirming,
    isSuccess,
    deployedAddress,
    error: deployError,
    ensStep,
    ensName,
    ensError,
    isEnsRegistering,
  } = useCivitasContractDeploy();

  const [deploymentError, setDeploymentError] = useState<string | null>(null);
  const [ensResolutionReport, setEnsResolutionReport] = useState<ENSResolutionReport | null>(null);
  const [isResolvingENS, setIsResolvingENS] = useState(false);
  const [customBasename, setCustomBasename] = useState<string | null>(null);
  const [isValidatingBasename, setIsValidatingBasename] = useState(false);

  const allTemplates = templateRegistry.getAll();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const onSubmit = async () => {
    console.log('[CreatePage] onSubmit called', { input, hasAppend: !!append, hasSetInput: !!setInput });
    if (!input.trim()) {
      console.log('[CreatePage] input empty, ignoring');
      return;
    }

    try {
      // Clear input immediately to prevent double submission and improve UX
      const currentInput = input;
      if (typeof setInput === 'function') {
        setInput('');
      } else {
        console.warn('[CreatePage] setInput is not a function');
      }

      // Use append directly instead of handleSubmit
      console.log('[CreatePage] calling append with:', currentInput);
      await append({
        role: 'user',
        content: currentInput,
      });
      console.log('[CreatePage] append completed successfully');
    } catch (error) {
      console.error('[CreatePage] Failed to send message:', error);
      // Optionally restore input on error?
      // For now, let's just log it.
      // If we restore it, we might get into a loop if it keeps failing.
    }
  };

  // Adapter for TerminalInput which passes raw string value
  // We include defensive checks because useChat return values can vary by version/state
  const handleTerminalInputChange = (value: string) => {
    // Try setInput first (most direct)
    if (typeof setInput === 'function') {
      setInput(value);
      return;
    }

    // Fallback to handleInputChange with synthetic event
    if (typeof handleInputChange === 'function') {
      const event = {
        target: { value },
        preventDefault: () => { },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleInputChange(event);
      return;
    }

    console.warn('No input handler available (setInput or handleInputChange missing)');
  };

  const handleDeploy = async () => {
    if (!activeTemplate || !extractedConfig) {
      return;
    }

    // Step 0: Initial validation (basic fields)
    const initialValidationError = validateConfig(activeTemplate.id, extractedConfig);
    if (initialValidationError) {
      setDeploymentError(initialValidationError);
      return;
    }

    try {
      setDeploymentError(null);
      setEnsResolutionReport(null);

      // Step 0.5: Validate Custom Basename (if provided)
      if (customBasename) {
        setIsValidatingBasename(true);
        try {
          // Client-side format validation
          const basenameRegex = /^[a-z0-9]([a-z0-9-]{1,28}[a-z0-9])?$/;
          if (!basenameRegex.test(customBasename)) {
            throw new Error('Invalid basename format. Use lowercase letters, numbers, and hyphens only (3-30 characters).');
          }

          // Server-side availability check
          const availabilityResponse = await fetch('/api/check-basename', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              basename: customBasename,
              chainId: chainId,
            }),
          });

          if (!availabilityResponse.ok) {
            throw new Error('Failed to check basename availability');
          }

          const { available, suggestion } = await availabilityResponse.json();

          if (!available) {
            throw new Error(`Basename "${customBasename}" is already taken. ${suggestion ? `Try "${suggestion}" instead.` : ''}`);
          }
        } catch (err: any) {
          setDeploymentError(err.message);
          setIsValidatingBasename(false);
          return;
        } finally {
          setIsValidatingBasename(false);
        }
      }

      // Step 1: Resolve "me" references to walletAddress
      let resolvedConfig;
      try {
        resolvedConfig = resolveMeReferences(activeTemplate.id, extractedConfig, walletAddress);
      } catch (error: any) {
        setDeploymentError(error.message || 'Failed to resolve "me" references');
        return;
      }

      // Step 2: Resolve any ENS names in the config
      setIsResolvingENS(true);
      const resolutionReport = await resolveConfigENSNames(activeTemplate.id, resolvedConfig);
      setIsResolvingENS(false);
      setEnsResolutionReport(resolutionReport);

      if (!resolutionReport.success) {
        setDeploymentError(
          `ENS Resolution Failed:\n${resolutionReport.errors.join('\n')}\n\nPlease use valid ENS names or raw Ethereum addresses (0x...).`
        );
        return;
      }

      // Step 3: Final validation with fully resolved addresses (e.g. owner != recipient checks)
      const finalValidationError = validateConfig(activeTemplate.id, resolutionReport.resolvedConfig);
      if (finalValidationError) {
        setDeploymentError(finalValidationError);
        return;
      }

      // Transform resolved config to deployment params
      const params = transformConfigToDeployParams(activeTemplate.id, resolutionReport.resolvedConfig);

      // Map template ID to CONTRACT_TEMPLATES constant
      let templateConstant: ContractTemplate;
      switch (activeTemplate.id) {
        case 'rent-vault':
          templateConstant = CONTRACT_TEMPLATES.RENT_VAULT;
          break;
        case 'group-buy-escrow':
          templateConstant = CONTRACT_TEMPLATES.GROUP_BUY_ESCROW;
          break;
        case 'stable-allowance-treasury':
          templateConstant = CONTRACT_TEMPLATES.STABLE_ALLOWANCE_TREASURY;
          break;
        default:
          throw new Error(`Unknown template: ${activeTemplate.id}`);
      }

      // Deploy contract
      await deployContract(templateConstant, params, customBasename);
    } catch (error: any) {
      console.error('Deployment error:', error);
      setDeploymentError(error.message || 'Failed to deploy contract');
    }
  };

  const isDeploying = isPending || isConfirming || isValidatingBasename;

  return (
    <WalletGate
      fallbackTitle="Connect to Create"
      fallbackMessage="Connect your wallet to start creating agreements with AI"
    >
      <div className="min-h-screen h-screen overflow-hidden bg-[#FAF9F6]">
        {/* Zone A: Navigation Rail (Left - 88px) */}
        <NavigationRail />

        {/* Main Content Area - offset by nav rail width */}
        <div className="ml-[88px] h-full flex">
          {/* Zone B: Command Center (Center - 45% of remaining space) */}
          <div className="w-[45%] flex flex-col bg-white border-r-[3px] border-black">
            {/* Marquee Ticker */}
            <MarqueeTicker />

            {/* Template Selector (if no template selected) */}
            {!activeTemplate && (
              <>
                <div className="flex-1 overflow-y-auto flex flex-col">
                  {/* Show messages (General Chat Mode) - Hides Selector when active */}
                  {messages.length > 0 && (
                    <div className="flex-1 p-8 pattern-grid relative">
                      {messages.map((message, index) => {
                        const isLastMessage = index === messages.length - 1;
                        return (
                          <div key={message.id} className="relative z-10">
                            <ChatBubble
                              message={message}
                              isLoading={isLoading && isLastMessage && message.role === 'assistant'}
                            />
                          </div>
                        );
                      })}

                      {isLoading && (
                        <div className="flex justify-start mb-6 relative z-10">
                          <div className="bg-stark-white border-[3px] border-black px-6 py-5 shadow-[3px_3px_0px_#000]">
                            <LoadingSquares size="md" />
                          </div>
                        </div>
                      )}

                      {/* Auto-scroll anchor */}
                      <div ref={messagesEndRef} />
                    </div>
                  )}

                  {/* Template Selector - Only shown when no messages (Landing Mode) */}
                  {messages.length === 0 && (
                    <TemplateSelector
                      templates={allTemplates}
                      onSelect={handleTemplateSelect}
                      detectedTemplate={detectedTemplate}
                    />
                  )}
                </div>

                {/* Input Area - Always visible for AI detection */}
                <div className="border-t-[3px] border-black p-4 bg-paper-cream shrink-0">
                  <TerminalInput
                    value={input}
                    onChange={handleTerminalInputChange}
                    onSubmit={onSubmit}
                    placeholder="Describe what you want to create..."
                    disabled={isLoading}
                  />
                </div>
              </>
            )}

            {/* Chat Interface (if template selected) */}
            {activeTemplate && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Chat Header */}
                <div className="bg-warning-yellow border-b-[3px] border-black px-6 py-3 shrink-0">
                  <div className="flex items-center justify-between">
                    <h2 className="font-headline text-xl uppercase tracking-wide text-black">
                      {activeTemplate.name}
                    </h2>
                    <button
                      onClick={() => handleTemplateSelect('')}
                      className="font-mono text-sm underline hover:no-underline"
                    >
                      Change Template
                    </button>
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-8 relative pattern-grid">
                  {messages.length === 0 && (
                    <div className="bg-white border-[3px] border-black shadow-[4px_4px_0px_#000] mx-auto max-w-lg mt-12 p-8">
                      <div className="text-center space-y-4">
                        <h3 className="font-headline text-3xl uppercase text-black leading-tight">
                          LET&apos;S BUILD
                        </h3>
                        <p className="font-display text-base text-black leading-relaxed">
                          Tell me about your {activeTemplate.name.toLowerCase()} and I&apos;ll help you create it on-chain.
                        </p>
                      </div>
                    </div>
                  )}

                  {messages.map((message, index) => {
                    const isLastMessage = index === messages.length - 1;
                    return (
                      <div key={message.id} className="relative z-10">
                        <ChatBubble
                          message={message}
                          isLoading={isLoading && isLastMessage && message.role === 'assistant'}
                        />
                      </div>
                    );
                  })}

                  {isLoading && (
                    <div className="flex justify-start mb-6 relative z-10">
                      <div className="bg-stark-white border-[3px] border-black px-6 py-5 shadow-[3px_3px_0px_#000]">
                        <LoadingSquares size="md" />
                      </div>
                    </div>
                  )}

                  {/* Auto-scroll anchor */}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="border-t-[3px] border-black p-4 bg-paper-cream shrink-0">
                  <TerminalInput
                    value={input}
                    onChange={handleTerminalInputChange}
                    onSubmit={onSubmit}
                    placeholder="Describe your agreement..."
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Zone C: Execution Deck (Right - Remaining 55%) */}
          <div
            className="flex-1 overflow-y-auto p-8"
            style={{
              backgroundImage:
                'radial-gradient(circle, #000 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0',
              opacity: 0.95,
            }}
          >
            {activeTemplate && extractedConfig && (
              <>
                <ContractReceiptCard
                  template={activeTemplate}
                  config={extractedConfig}
                  onDeploy={handleDeploy}
                  onBasenameChange={setCustomBasename}
                  isDeploying={isDeploying}
                  isSuccess={isSuccess}
                  deployedAddress={deployedAddress ?? undefined}
                  ensName={ensName}
                  ensDomain={ensDomain}
                />

                {/* Deployment Status Messages */}
                {deploymentError && (
                  <div className="mt-4">
                    <StatusBanner variant="error" onDismiss={() => setDeploymentError(null)}>
                      {deploymentError}
                    </StatusBanner>
                  </div>
                )}

                {deployError && (
                  <div className="mt-4">
                    <StatusBanner variant="error">
                      Transaction failed: {deployError.message}
                    </StatusBanner>
                  </div>
                )}

                {/* ENS Resolution Status */}
                {isResolvingENS && (
                  <div className="mt-4">
                    <StatusBanner variant="info">
                      Resolving ENS names...
                    </StatusBanner>
                  </div>
                )}

                {ensResolutionReport && ensResolutionReport.success && ensResolutionReport.resolutions.size > 0 && (
                  <div className="mt-4">
                    <div className="bg-white border-[3px] border-black p-4 shadow-[4px_4px_0px_#000]">
                      <p className="font-mono text-xs uppercase font-bold opacity-60 mb-2">Resolved Addresses</p>
                      <div className="space-y-1">
                        {Array.from(ensResolutionReport.resolutions.entries()).map(([input, result]) => (
                          <div key={input} className="font-mono text-sm flex items-center gap-2">
                            {isENSName(input) ? (
                              <>
                                <span className="text-void-black">{input}</span>
                                <span className="text-gray-400">→</span>
                                <span className="text-green-600">{formatAddress(result.address || '')}</span>
                                <span className="text-green-500">✓</span>
                              </>
                            ) : (
                              <>
                                <span className="text-gray-500">{formatAddress(input)}</span>
                                <span className="text-gray-400">(raw)</span>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Deployment Progress */}
                {isDeploying && !isSuccess && (
                  <div className="mt-4">
                    <StatusBanner variant="info">
                      {isValidatingBasename
                        ? 'Validating name availability...'
                        : 'Deploying contract... Please wait for confirmation.'}
                    </StatusBanner>
                  </div>
                )}

                {/* ENS Registration Status */}
                {ensStep === 'generating' && (
                  <div className="mt-4">
                    <StatusBanner variant="info">
                      Generating ENS name...
                    </StatusBanner>
                  </div>
                )}

                {ensStep === 'registering' && (
                  <div className="mt-4">
                    <StatusBanner variant="warning">
                      Registering ENS name... (sign transaction)
                    </StatusBanner>
                  </div>
                )}

                {ensStep === 'done' && ensName && (
                  <div className="hidden" />
                )}

                {ensStep === 'skipped' && ensError && (
                  <div className="mt-4">
                    <StatusBanner variant="warning">
                      ENS registration skipped: {ensError}
                    </StatusBanner>
                  </div>
                )}

                {/* Deployment Success - Redirect to Dashboard */}
                {isSuccess && deployedAddress && (
                  <div className="mt-6">
                    <div className="bg-acid-lime border-[3px] border-black p-6 shadow-[4px_4px_0px_#000]">
                      <div className="text-center">
                        <div className="text-6xl mb-4">✓</div>
                        <h3 className="font-headline text-2xl uppercase mb-2">Contract Deployed!</h3>
                        <p className="font-display text-sm mb-4">
                          Your contract is ready. Go to the dashboard to fund it.
                        </p>
                        <div className="bg-gray-100 border-[2px] border-black p-3 mb-4">
                          <p className="font-mono text-xs break-all">
                            {deployedAddress}
                          </p>
                        </div>
                        <a
                          href="/dashboard"
                          className="inline-block bg-black text-white font-mono uppercase px-6 py-3 border-[3px] border-black hover:bg-gray-800 transition-colors"
                        >
                          Go to Dashboard
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {!activeTemplate && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="font-black text-4xl uppercase mb-4 opacity-20">
                  /// STANDBY ///
                  </div>
                  <p className="font-mono text-sm opacity-40">
                    SELECT TEMPLATE TO BEGIN
                  </p>
                </div>
              </div>
            )}

            {activeTemplate && !extractedConfig && (
              <div className="flex items-center justify-center h-full">
                <StatusBanner variant="info">
                  Start chatting to configure your {activeTemplate.name.toLowerCase()}
                </StatusBanner>
              </div>
            )}
          </div>
        </div>
      </div>
    </WalletGate>
  );
}
