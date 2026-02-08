'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useConfig } from 'wagmi';
import { getPublicClient } from '@wagmi/core';
import { getRoutes, executeRoute, type Route, type RoutesRequest, type TransactionRequestParameters } from '@lifi/sdk';
import { configureLiFiSDK } from '@/lib/lifi/sdk-config';
import { LIFI_SUPPORTED_CHAIN_IDS, USDC_ADDRESSES } from '@/lib/lifi/constants';
import { formatUnits } from 'viem';

interface LiFiBridgeStepProps {
  destinationAddress: `0x${string}`;
  amount: bigint;
  onBridgeStarted: (txHash: string) => void;
  onBridgeCompleted: () => void;
  onError: (error: Error) => void;
  recommendedSource?: {
    chainId: number;
    tokenAddress: string;
    tokenSymbol: string;
    tool?: string;
  };
  preselectedRoute?: {
    sourceChainId: number;
    sourceTokenAddress: string;
    sourceToken: string;
    tool: string;
    isDirect?: boolean;
    action?: any; // LI.FI route action for direct execution
  };
  autoExecute?: boolean; // Skip UI and execute immediately
}

type BridgeState = 'idle' | 'loading-routes' | 'selecting' | 'executing' | 'completed' | 'error';


interface RouteOption {
  route: Route;
  estimatedTime: number;
  estimatedOutput: string;
  gasCost: string;
}

/**
 * LI.FI SDK-based bridge step for cross-chain funding
 *
 * NOTE: Only works on MAINNET. For testnet, use DirectFundingStep instead.
 *
 * Funds are sent directly to `destinationAddress` (the contract),
 * NOT to the user's connected wallet.
 */
export function LiFiBridgeStep({
  destinationAddress,
  amount,
  onBridgeStarted,
  onBridgeCompleted,
  onError,
  recommendedSource,
  preselectedRoute,
  autoExecute = false,
}: LiFiBridgeStepProps) {
  const { address } = useAccount();
  const wagmiConfig = useConfig();

  const [state, setState] = useState<BridgeState>('idle');
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [executionStatus, setExecutionStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Source chain selection
  const [fromChainId, setFromChainId] = useState<number>(
    preselectedRoute?.sourceChainId || recommendedSource?.chainId || LIFI_SUPPORTED_CHAIN_IDS.ETHEREUM_MAINNET
  );

  // Token selection state
  const [fromTokenAddress, setFromTokenAddress] = useState<string>(
    preselectedRoute?.sourceTokenAddress || recommendedSource?.tokenAddress || USDC_ADDRESSES[LIFI_SUPPORTED_CHAIN_IDS.ETHEREUM_MAINNET] || ''
  );
  const [fromTokenSymbol, setFromTokenSymbol] = useState<string>(
    preselectedRoute?.sourceToken || recommendedSource?.tokenSymbol || 'USDC'
  );
  const [availableTokens, setAvailableTokens] = useState<any[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);

  // Convert amount prop (bigint) to USDC string for display
  const amountInUsdc = formatUnits(amount, 6);

  // Initialize from preselected route or recommendation
  useEffect(() => {
    if (preselectedRoute) {
      setFromChainId(preselectedRoute.sourceChainId);
      setFromTokenAddress(preselectedRoute.sourceTokenAddress);
      setFromTokenSymbol(preselectedRoute.sourceToken);
    } else if (recommendedSource) {
      setFromChainId(recommendedSource.chainId);
      setFromTokenAddress(recommendedSource.tokenAddress);
      setFromTokenSymbol(recommendedSource.tokenSymbol);
    }
  }, [preselectedRoute, recommendedSource]);

  // Fetch user's tokens when chain changes
  useEffect(() => {
    if (!address || !fromChainId) return;
    setIsLoadingTokens(true);

    // Use LI.FI REST API to get token balances
    fetch(`https://li.quest/v1/token/balances?walletAddress=${address}&chains=${fromChainId}`)
      .then(res => res.json())
      .then(data => {
        const chainTokens = data[fromChainId] || [];
        const tokens = chainTokens
          .filter((t: any) => parseFloat(t.amount || '0') > 0)
          // Sort by USD value desc (if price available) or amount
          .sort((a: any, b: any) => parseFloat(b.amount || '0') - parseFloat(a.amount || '0'));
        setAvailableTokens(tokens);

        // If current selected token is not in list (and not AI recommendation), default to USDC or first token
        if (!recommendedSource && tokens.length > 0 && !tokens.find((t: any) => t.address === fromTokenAddress)) {
           // Default to USDC if available, else first token
           const usdc = tokens.find((t: any) => t.symbol === 'USDC');
           if (usdc) {
             setFromTokenAddress(usdc.address);
             setFromTokenSymbol('USDC');
           } else {
             setFromTokenAddress(tokens[0].address);
             setFromTokenSymbol(tokens[0].symbol);
           }
        }
      })
      .catch((err) => {
        console.error('Failed to fetch tokens:', err);
        // Fallback: just show USDC
        setAvailableTokens([{ symbol: 'USDC', address: USDC_ADDRESSES[fromChainId] }]);
      })
      .finally(() => setIsLoadingTokens(false));
  }, [address, fromChainId, recommendedSource, fromTokenAddress]);

  // Auto-trigger route discovery and execution when autoExecute is true
  useEffect(() => {
    if (autoExecute && preselectedRoute && address) {
      const timer = setTimeout(() => {
        if (state === 'idle') {
          // Fetch routes first, then auto-select and execute
          fetchRoutes();
        }
      }, 300);
      return () => clearTimeout(timer);
    } else if (!autoExecute) {
      // Normal auto-trigger for manual mode
      const shouldAutoTrigger =
        (preselectedRoute && address && fromTokenAddress === preselectedRoute.sourceTokenAddress) ||
        (recommendedSource && address && fromTokenAddress === recommendedSource.tokenAddress);

      if (shouldAutoTrigger) {
        const timer = setTimeout(() => {
          if (state === 'idle') {
            fetchRoutes();
          }
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [autoExecute, preselectedRoute, recommendedSource, address, fromTokenAddress, state]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select when routes are fetched in autoExecute mode
  useEffect(() => {
    if (autoExecute && state === 'selecting' && routes.length > 0 && !selectedRoute) {
      // Auto-select the first route (best match)
      const bestRoute = routes[0].route;
      setSelectedRoute(bestRoute);
    }
  }, [autoExecute, state, routes, selectedRoute]);

  // Auto-execute when route is selected in autoExecute mode
  useEffect(() => {
    if (!autoExecute || !selectedRoute || state !== 'selecting') return;

    // Execute the route directly
    setState('executing');
    setExecutionStatus('Preparing transaction...');

    const execute = async () => {
      try {
        const executedRoute = await executeRoute(selectedRoute, {
          updateTransactionRequestHook: applyGasBuffer,
          updateRouteHook(updatedRoute) {
            // Track execution progress
            const currentStep = updatedRoute.steps?.find(
              (step) => step.execution?.status === 'PENDING' || step.execution?.status === 'ACTION_REQUIRED'
            );

            if (currentStep?.execution?.status === 'ACTION_REQUIRED') {
              setExecutionStatus('Please confirm in your wallet...');
            } else if (currentStep) {
              setExecutionStatus(`Executing: ${currentStep.action?.fromToken?.symbol} → ${currentStep.action?.toToken?.symbol}`);
            }

            // Check for tx hash
            const process = currentStep?.execution?.process?.[0];
            if (process?.txHash) {
              onBridgeStarted(process.txHash);
            }
          },
          acceptExchangeRateUpdateHook: async () => true, // Auto-accept rate changes
        });

        setState('completed');
        setExecutionStatus('Bridge completed!');
        onBridgeCompleted();
      } catch (err: any) {
        console.error('Bridge execution failed:', err);

        // Detect gas balance errors and provide clear message
        let errorMessage = err.message || 'Bridge execution failed';
        const chainInfo = sourceChains.find(c => c.id === fromChainId);
        const nativeToken = chainInfo?.nativeToken || 'ETH';
        const chainName = chainInfo?.name || 'source chain';

        if (err.message?.includes('fee cap') || err.message?.includes('maxFeePerGas') || err.message?.includes('baseFee')) {
          errorMessage = `Gas fee estimation issue on ${chainName}. This can happen when gas prices change rapidly. Please try again.`;
        } else if (err.message?.includes('BalanceError') || err.message?.includes('balance is too low') || err.message?.includes('insufficient funds') || err.message?.includes('exceeds balance')) {
          errorMessage = `Insufficient balance on ${chainName}. Make sure you have enough ${fromTokenSymbol} to bridge and enough ${nativeToken} for gas fees.`;
        }

        setError(errorMessage);
        setState('error');
        onError(new Error(errorMessage));
      }
    };

    execute();
  }, [autoExecute, selectedRoute, state]); // eslint-disable-line react-hooks/exhaustive-deps

  // Configure SDK on mount
  useEffect(() => {
    configureLiFiSDK(wagmiConfig);
  }, [wagmiConfig]);

  // Fix for L2 gas estimation: Coinbase Wallet overrides EIP-1559 maxFeePerGas with its own
  // estimate that's too tight for L2s like Arbitrum. Workaround: use gasPrice (legacy tx type)
  // for L2 chains. Wallets don't re-estimate legacy transactions. On L2s this costs essentially
  // the same since gas prices are < 0.1 gwei.
  const L2_CHAIN_IDS = [42161, 10, 8453, 137]; // Arbitrum, Optimism, Base, Polygon

  const applyGasBuffer = async (txRequest: TransactionRequestParameters) => {
    const updated = { ...txRequest };

    if (updated.chainId) {
      try {
        const publicClient = getPublicClient(wagmiConfig, { chainId: updated.chainId });
        if (publicClient) {
          const block = await publicClient.getBlock();
          if (block?.baseFeePerGas) {
            if (L2_CHAIN_IDS.includes(updated.chainId)) {
              // L2: use gasPrice to force legacy tx (wallets don't override these)
              updated.gasPrice = (block.baseFeePerGas * 200n) / 100n;
              updated.maxFeePerGas = undefined;
              updated.maxPriorityFeePerGas = undefined;
            } else {
              // L1: use EIP-1559 with buffer
              updated.maxFeePerGas = (block.baseFeePerGas * 200n) / 100n;
              if (!updated.maxPriorityFeePerGas) {
                updated.maxPriorityFeePerGas = 1_000_000_000n; // 1 gwei
              }
            }
          }
        }
      } catch (e) {
        console.warn('[LiFiBridge] Failed to fetch base fee for gas buffer:', e);
      }
    }

    return updated;
  };

  // Destination is always Base USDC
  const toChainId = LIFI_SUPPORTED_CHAIN_IDS.BASE_MAINNET;
  const toTokenAddress = USDC_ADDRESSES[toChainId];

  const sourceChains = [
    { id: LIFI_SUPPORTED_CHAIN_IDS.ETHEREUM_MAINNET, name: 'Ethereum', nativeToken: 'ETH' },
    { id: LIFI_SUPPORTED_CHAIN_IDS.ARBITRUM_MAINNET, name: 'Arbitrum', nativeToken: 'ETH' },
    { id: LIFI_SUPPORTED_CHAIN_IDS.OPTIMISM_MAINNET, name: 'Optimism', nativeToken: 'ETH' },
    { id: LIFI_SUPPORTED_CHAIN_IDS.POLYGON_MAINNET, name: 'Polygon', nativeToken: 'MATIC' },
  ];

  const fetchRoutes = useCallback(async () => {
    if (!address) {
      setError('Please connect your wallet');
      return;
    }

    if (amount <= 0n) {
      setError('Invalid amount');
      return;
    }

    setState('loading-routes');
    setError(null);
    setRoutes([]);

    try {
      // Use USDC as source token (USDC → USDC bridging only)
      const fromTokenAddress = USDC_ADDRESSES[fromChainId];

      if (!fromTokenAddress) {
        setError('USDC not supported on selected chain');
        setState('error');
        return;
      }

      // Use the amount prop directly (already in 6 decimals as bigint)
      const fromAmountWei = amount.toString();

      const routesRequest: RoutesRequest = {
        fromChainId,
        toChainId,
        fromTokenAddress,
        toTokenAddress,
        fromAmount: fromAmountWei,
        fromAddress: address,
        toAddress: destinationAddress, // Send to contract, not user wallet
      };

      const result = await getRoutes(routesRequest);

      if (!result.routes || result.routes.length === 0) {
        setError('No routes found. Try a different amount or source chain.');
        setState('idle');
        return;
      }

      const routeOptions: RouteOption[] = result.routes.slice(0, 3).map((route) => ({
        route,
        estimatedTime: route.steps?.reduce((acc, step) => acc + (step.estimate?.executionDuration || 0), 0) || 0,
        estimatedOutput: formatUnits(BigInt(route.toAmount || '0'), 6),
        gasCost: route.gasCostUSD || '0',
      }));

      setRoutes(routeOptions);
      setState('selecting');
    } catch (err: any) {
      console.error('Failed to fetch routes:', err);
      setError(err.message || 'Failed to fetch routes');
      setState('error');
    }
  }, [address, amount, fromChainId, toChainId, toTokenAddress, destinationAddress]);

  const executeSelectedRoute = useCallback(async () => {
    if (!selectedRoute) return;

    setState('executing');
    setExecutionStatus('Preparing transaction...');

    try {
      const executedRoute = await executeRoute(selectedRoute, {
        updateTransactionRequestHook: applyGasBuffer,
        updateRouteHook(updatedRoute) {
          // Track execution progress
          const currentStep = updatedRoute.steps?.find(
            (step) => step.execution?.status === 'PENDING' || step.execution?.status === 'ACTION_REQUIRED'
          );

          if (currentStep?.execution?.status === 'ACTION_REQUIRED') {
            setExecutionStatus('Please confirm in your wallet...');
          } else if (currentStep) {
            setExecutionStatus(`Executing: ${currentStep.action?.fromToken?.symbol} → ${currentStep.action?.toToken?.symbol}`);
          }

          // Check for tx hash
          const process = currentStep?.execution?.process?.[0];
          if (process?.txHash) {
            onBridgeStarted(process.txHash);
          }
        },
        acceptExchangeRateUpdateHook: async () => true, // Auto-accept rate changes
      });

      setState('completed');
      setExecutionStatus('Bridge completed!');
      onBridgeCompleted();
    } catch (err: any) {
      console.error('Bridge execution failed:', err);

      // Detect gas balance errors and provide clear message
      let errorMessage = err.message || 'Bridge execution failed';
      if (err.message?.includes('balance is too low') || err.message?.includes('insufficient funds') || err.message?.includes('BalanceError') || err.message?.includes('fee cap') || err.message?.includes('maxFeePerGas')) {
        const chainInfo = sourceChains.find(c => c.id === fromChainId);
        const nativeToken = chainInfo?.nativeToken || 'ETH';
        const chainName = chainInfo?.name || 'source chain';
        errorMessage = `Gas fee estimation issue on ${chainName}. This can happen when gas prices change rapidly. Please try again.`;
      }

      setError(errorMessage);
      setState('error');
      onError(new Error(errorMessage));
    }
  }, [selectedRoute, onBridgeStarted, onBridgeCompleted, onError]);

  return (
    <div className="w-full space-y-4">
      {/* Info Banner */}
      {!autoExecute && (
        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-sm text-blue-300">
            Funds will be sent directly to the contract address:
          </p>
          <code className="text-xs text-blue-400 break-all">{destinationAddress}</code>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Source Chain & Amount Selection */}
      {!autoExecute && (state === 'idle' || state === 'loading-routes' || state === 'error') && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Source Chain</label>
            <select
              value={fromChainId}
              onChange={(e) => setFromChainId(Number(e.target.value))}
              className="w-full p-3 border-2 border-black rounded bg-white"
              disabled={state === 'loading-routes'}
            >
              {sourceChains.map((chain) => (
                <option key={chain.id} value={chain.id}>
                  {chain.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Source Token
              {((preselectedRoute && fromTokenAddress === preselectedRoute.sourceTokenAddress) ||
                (recommendedSource && fromTokenAddress === recommendedSource.tokenAddress)) && (
                <span className="ml-2 text-xs bg-[#CCFF00] border border-black px-2 py-0.5 font-bold">
                  AI PICK
                </span>
              )}
            </label>
            <select
              value={fromTokenAddress}
              onChange={(e) => {
                const token = availableTokens.find(t => t.address === e.target.value);
                setFromTokenAddress(e.target.value);
                setFromTokenSymbol(token?.symbol || 'Unknown');
              }}
              className="w-full p-3 border-2 border-black rounded bg-white"
              disabled={state === 'loading-routes' || isLoadingTokens}
            >
              {availableTokens.length > 0 ? (
                availableTokens.map((token) => (
                  <option key={token.address} value={token.address}>
                    {token.symbol} {token.amount ? `(${parseFloat(token.amount).toFixed(4)})` : ''}
                  </option>
                ))
              ) : (
                <option value={USDC_ADDRESSES[fromChainId] || ''}>USDC</option>
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Amount (USDC)
            </label>
            <input
              type="text"
              value={amountInUsdc}
              readOnly
              className="w-full p-3 border-2 border-black rounded bg-gray-100 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">
              This amount will be bridged to Base
            </p>
          </div>

          <button
            onClick={fetchRoutes}
            disabled={state === 'loading-routes'}
            className="w-full bg-black text-white font-mono uppercase py-3 border-2 border-black hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state === 'loading-routes' ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Finding Routes...
              </span>
            ) : (
              'Find Routes'
            )}
          </button>
        </div>
      )}

      {/* Route Selection */}
      {!autoExecute && state === 'selecting' && routes.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium">Select a Route</h4>
          {routes.map((option, index) => (
            <button
              key={index}
              onClick={() => setSelectedRoute(option.route)}
              className={`w-full p-4 border-2 rounded text-left transition-colors ${
                selectedRoute === option.route
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-mono font-bold">{option.estimatedOutput} USDC</p>
                  <p className="text-xs text-gray-500">
                    ~{Math.round(option.estimatedTime / 60)} min • Gas: ${option.gasCost}
                  </p>
                </div>
                {selectedRoute === option.route && (
                  <span className="text-blue-500">✓</span>
                )}
              </div>
            </button>
          ))}

          <button
            onClick={executeSelectedRoute}
            disabled={!selectedRoute}
            className="w-full bg-black text-white font-mono uppercase py-3 border-2 border-black hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Execute Bridge
          </button>

          <button
            onClick={() => {
              setState('idle');
              setRoutes([]);
              setSelectedRoute(null);
            }}
            className="w-full text-sm text-gray-500 hover:text-gray-700 underline"
          >
            ← Back to source selection
          </button>
        </div>
      )}

      {/* Execution Status */}
      {state === 'executing' && (
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="font-medium">{executionStatus}</p>
          <p className="text-xs text-gray-500 mt-2">
            Please do not close this window
          </p>
        </div>
      )}

      {/* Completion */}
      {state === 'completed' && (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">✓</div>
          <p className="font-medium text-green-600">Bridge Completed!</p>
          <p className="text-sm text-gray-500 mt-2">
            Funds are being sent to the contract
          </p>
        </div>
      )}
    </div>
  );
}
