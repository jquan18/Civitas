'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useConfig } from 'wagmi';
import { getRoutes, executeRoute, type Route, type RoutesRequest } from '@lifi/sdk';
import { configureLiFiSDK } from '@/lib/lifi/sdk-config';
import { LIFI_SUPPORTED_CHAIN_IDS, USDC_ADDRESSES } from '@/lib/lifi/constants';
import { formatUnits } from 'viem';

interface LiFiBridgeStepProps {
  destinationAddress: `0x${string}`;
  amount: bigint;
  onBridgeStarted: (txHash: string) => void;
  onBridgeCompleted: () => void;
  onError: (error: Error) => void;
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
}: LiFiBridgeStepProps) {
  const { address } = useAccount();
  const wagmiConfig = useConfig();

  const [state, setState] = useState<BridgeState>('idle');
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [executionStatus, setExecutionStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Source chain selection (user picks where to bridge from)
  const [fromChainId, setFromChainId] = useState<number>(LIFI_SUPPORTED_CHAIN_IDS.ETHEREUM_MAINNET);

  // Convert amount prop (bigint) to USDC string for display
  const amountInUsdc = formatUnits(amount, 6);

  // Configure SDK on mount
  useEffect(() => {
    configureLiFiSDK(wagmiConfig);
  }, [wagmiConfig]);

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
      if (err.message?.includes('balance is too low') || err.message?.includes('insufficient funds') || err.message?.includes('BalanceError')) {
        const chainInfo = sourceChains.find(c => c.id === fromChainId);
        const nativeToken = chainInfo?.nativeToken || 'ETH';
        const chainName = chainInfo?.name || 'source chain';
        errorMessage = `Insufficient ${nativeToken} for gas fees on ${chainName}. You need a small amount of ${nativeToken} (~$1-2) to pay for transaction fees, even when bridging USDC.`;
      }

      setError(errorMessage);
      setState('error');
      onError(new Error(errorMessage));
    }
  }, [selectedRoute, onBridgeStarted, onBridgeCompleted, onError]);

  return (
    <div className="w-full space-y-4">
      {/* Info Banner */}
      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <p className="text-sm text-blue-300">
          Funds will be sent directly to the contract address:
        </p>
        <code className="text-xs text-blue-400 break-all">{destinationAddress}</code>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Source Chain & Amount Selection */}
      {(state === 'idle' || state === 'loading-routes' || state === 'error') && (
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
                  {chain.name} (USDC)
                </option>
              ))}
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
      {state === 'selecting' && routes.length > 0 && (
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
