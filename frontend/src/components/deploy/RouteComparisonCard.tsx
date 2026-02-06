import React from 'react';
import { formatUnits } from 'viem';

interface Route {
  sourceChainId: number;
  sourceToken: string;
  sourceTokenAddress: string;
  gasCostUsd: string;
  executionDuration: number;
  tool: string;
  steps?: number;
}

interface RouteComparisonCardProps {
  routes: Route[];
  recommendedIndex: number;
  requiredAmount: string; // e.g., "1200"
}

const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum',
  10: 'Optimism',
  137: 'Polygon',
  8453: 'Base',
  42161: 'Arbitrum',
  11155111: 'Sepolia',
  84532: 'Base Sepolia',
};

export function RouteComparisonCard({
  routes,
  recommendedIndex,
  requiredAmount,
}: RouteComparisonCardProps) {
  if (!routes || routes.length === 0) return null;

  return (
    <div className="w-full bg-white border-[3px] border-black shadow-[4px_4px_0px_#000000]">
      {/* Header */}
      <div className="bg-black text-white p-3 flex justify-between items-center">
        <div className="font-bold text-sm uppercase tracking-wider">Cross-Chain Funding Routes</div>
        <div className="text-xs bg-[#CCFF00] text-black px-2 py-0.5 font-bold rounded-sm">
          AI ANALYZED
        </div>
      </div>

      <div className="p-4">
        <p className="text-sm text-gray-600 mb-3">
          Found {routes.length} ways to fund your contract with <span className="font-bold text-black">{requiredAmount} USDC</span>.
        </p>

        <div className="space-y-2">
          {routes.map((route, index) => {
            const isRecommended = index === recommendedIndex;
            const chainName = CHAIN_NAMES[route.sourceChainId] || `Chain ${route.sourceChainId}`;
            const durationMins = Math.ceil(route.executionDuration / 60);

            return (
              <div
                key={`${route.sourceChainId}-${route.sourceToken}`}
                className={`
                  relative border-2 p-3 transition-all
                  ${isRecommended
                    ? 'border-black bg-[#f0fdf4] shadow-[2px_2px_0px_#000000] z-10'
                    : 'border-gray-200 bg-gray-50 text-gray-500'
                  }
                `}
              >
                {isRecommended && (
                  <div className="absolute -top-2.5 -right-2.5 bg-[#CCFF00] border-2 border-black text-xs font-bold px-2 py-0.5 rotate-2 shadow-sm">
                    BEST ROUTE
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {/* Chain Icon Placeholder */}
                    <div className={`
                      w-8 h-8 rounded-full border border-black flex items-center justify-center font-bold text-xs
                      ${isRecommended ? 'bg-white' : 'bg-gray-200'}
                    `}>
                      {chainName.substring(0, 2).toUpperCase()}
                    </div>

                    <div>
                      <div className={`font-bold text-sm ${isRecommended ? 'text-black' : 'text-gray-600'}`}>
                        {chainName}
                      </div>
                      <div className="text-xs font-mono">
                        {route.sourceToken}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`font-bold ${isRecommended ? 'text-green-700' : 'text-gray-600'}`}>
                      ${parseFloat(route.gasCostUsd).toFixed(2)} Gas
                    </div>
                    <div className="text-xs flex items-center justify-end gap-1">
                      <span>~{durationMins} min</span>
                      <span className="text-gray-400">•</span>
                      <span>{route.tool}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
