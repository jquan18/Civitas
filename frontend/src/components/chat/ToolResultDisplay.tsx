import React from 'react';

interface ToolResultDisplayProps {
  toolInvocation: any; // Tool call or tool result part from UIMessage
}

export function ToolResultDisplay({ toolInvocation }: ToolResultDisplayProps) {
  const { type, toolName, result } = toolInvocation;

  // Show loading state (tool-call type)
  if (type === 'tool-call') {
    return (
      <div className="mt-3 border-2 border-black bg-gray-100 p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
          <span className="font-mono text-sm font-bold">
            {getToolActionText(toolName)}...
          </span>
        </div>
      </div>
    );
  }

  // Show result (tool-result type)
  if (type === 'tool-result') {
    const success = result?.success ?? false;
    const borderColor = success ? 'border-green-600' : 'border-red-600';
    const bgColor = success ? 'bg-green-50' : 'bg-red-50';
    const icon = success ? '✓' : '✗';

    return (
      <div
        className={`mt-3 border-2 ${borderColor} ${bgColor} p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`}
      >
        <div className="flex items-start gap-2">
          <span className="text-lg font-bold">{icon}</span>
          <div className="flex-1 font-mono text-sm">
            {renderToolResult(toolName, result)}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function getToolActionText(toolName: string): string {
  switch (toolName) {
    case 'resolveENS':
      return 'Resolving ENS name';
    case 'checkBalance':
      return 'Checking USDC balance';
    case 'validateAddress':
      return 'Validating address';
    case 'scanWalletBalances':
      return 'Scanning wallet balances';
    case 'getOptimalFundingRoute':
      return 'Calculating optimal route';
    default:
      return 'Processing';
  }
}

function renderToolResult(toolName: string, result: any): React.ReactNode {
  if (!result) {
    return <span className="text-gray-600">No result</span>;
  }

  switch (toolName) {
    case 'resolveENS':
      return renderResolveENSResult(result);
    case 'checkBalance':
      return renderCheckBalanceResult(result);
    case 'validateAddress':
      return renderValidateAddressResult(result);
    case 'scanWalletBalances':
      return renderScanBalancesResult(result);
    case 'getOptimalFundingRoute':
      return renderOptimalRouteResult(result);
    default:
      return <span className="text-gray-600">Unknown tool: {toolName}</span>;
  }
}

function renderResolveENSResult(result: any): React.ReactNode {
  if (!result.success) {
    return (
      <div>
        <div className="font-bold text-red-700">Resolution Failed</div>
        <div className="mt-1 text-red-600">{result.error || 'Unknown error'}</div>
      </div>
    );
  }

  const sourceLabel =
    result.source === 'l1'
      ? 'L1 ENS'
      : result.source === 'l2'
        ? 'L2 Basename'
        : 'Raw Address';

  return (
    <div>
      <div className="font-bold text-green-700">
        {result.isENS ? 'Resolved ENS Name' : 'Valid Address'}
      </div>
      {result.isENS && (
        <div className="mt-1">
          <span className="text-gray-700">{result.input}</span>
          <span className="mx-2 text-gray-500">→</span>
          <span className="font-bold text-black">{result.shortAddress}</span>
        </div>
      )}
      {!result.isENS && (
        <div className="mt-1">
          <span className="font-bold text-black">{result.shortAddress}</span>
        </div>
      )}
      <div className="mt-1">
        <span className="inline-block rounded border border-black bg-white px-2 py-0.5 text-xs font-bold">
          {sourceLabel}
        </span>
      </div>
    </div>
  );
}

function renderCheckBalanceResult(result: any): React.ReactNode {
  if (!result.success) {
    return (
      <div>
        <div className="font-bold text-red-700">Balance Check Failed</div>
        <div className="mt-1 text-red-600">{result.error || 'Unknown error'}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="font-bold text-green-700">Balance Retrieved</div>
      <div className="mt-1">
        <span className="text-gray-700">Address:</span>{' '}
        <span className="font-bold text-black">{result.shortAddress}</span>
      </div>
      <div className="mt-1">
        <span className="text-gray-700">Balance:</span>{' '}
        <span className="text-2xl font-bold text-black">
          {parseFloat(result.balanceFormatted).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{' '}
        </span>
        <span className="text-lg font-bold text-gray-600">{result.currency}</span>
      </div>
      <div className="mt-1">
        <span className="inline-block rounded border border-black bg-white px-2 py-0.5 text-xs font-bold">
          {result.chainName}
        </span>
      </div>
    </div>
  );
}

function renderScanBalancesResult(result: any): React.ReactNode {
  if (!result.success) {
    return (
      <div>
        <div className="font-bold text-red-700">Scan Failed</div>
        <div className="mt-1 text-red-600">{result.error || 'Unknown error'}</div>
      </div>
    );
  }

  if (result.balances.length === 0) {
    return (
      <div>
        <div className="font-bold text-yellow-700">No Funds Found</div>
        <div className="mt-1 text-sm text-gray-600">
          Scanned Ethereum, Base, Arbitrum, Optimism, and Polygon.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="font-bold text-green-700">Funds Found</div>
      <div className="mt-1 flex flex-col gap-1">
        {result.balances.map((chain: any) => (
          <div key={chain.chainId} className="border-b border-gray-200 pb-1 last:border-0">
            <span className="font-bold text-xs uppercase text-gray-500">{chain.chainName}</span>
            <div className="flex gap-2 flex-wrap">
              {chain.balances.map((token: any) => (
                <span key={token.symbol} className="text-sm bg-gray-100 px-1 rounded">
                  <span className="font-bold">{parseFloat(token.amount).toFixed(4)}</span>{' '}
                  {token.symbol}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1 text-xs text-gray-500">
        AI will now calculate the best route...
      </div>
    </div>
  );
}

function renderOptimalRouteResult(result: any): React.ReactNode {
  if (!result.success) {
    return (
      <div>
        <div className="font-bold text-red-700">Route Calculation Failed</div>
        <div className="mt-1 text-red-600">{result.error || 'Unknown error'}</div>
      </div>
    );
  }

  const route = result.recommendation?.bestRoute || result.routes?.[0];

  if (!route) {
    return (
       <div>
        <div className="font-bold text-yellow-700">No Routes Found</div>
        <div className="mt-1 text-sm text-gray-600">
          Could not find a valid funding route.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="font-bold text-green-700">Optimal Route Found</div>
      <div className="mt-1 text-sm bg-green-50 p-2 rounded border border-green-200">
        <div className="flex justify-between items-center mb-1">
          <span className="text-gray-600 font-medium">Source:</span>
          <span className="font-bold">{route.sourceToken} on Chain {route.sourceChainId}</span>
        </div>
        <div className="flex justify-between items-center mb-1">
          <span className="text-gray-600 font-medium">Est. Gas:</span>
          <span className="font-bold text-green-700">${parseFloat(route.gasCostUsd).toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600 font-medium">Time:</span>
          <span className="font-bold">~{Math.ceil(route.executionDuration / 60)} min</span>
        </div>
      </div>
      <div className="mt-1 text-xs text-gray-500 text-center">
        Bridge via {route.tool}
      </div>
      {result.recommendation?.reason && (
        <div className="mt-2 text-xs italic text-gray-600 border-t border-gray-200 pt-1">
           "{result.recommendation.reason}"
        </div>
      )}
    </div>
  );
}

function renderValidateAddressResult(result: any): React.ReactNode {
  if (!result.success) {
    return (
      <div>
        <div className="font-bold text-red-700">Validation Failed</div>
        <div className="mt-1 text-red-600">{result.error || 'Unknown error'}</div>
      </div>
    );
  }

  const accountTypeColor = result.isContract ? 'text-purple-700' : 'text-blue-700';

  return (
    <div>
      <div className="font-bold text-green-700">Address Validated</div>
      <div className="mt-1">
        <span className="text-gray-700">Address:</span>{' '}
        <span className="font-bold text-black">{result.shortAddress}</span>
      </div>
      <div className="mt-1">
        <span className="text-gray-700">Type:</span>{' '}
        <span className={`font-bold ${accountTypeColor}`}>{result.accountType}</span>
      </div>
      <div className="mt-1">
        <span className="inline-block rounded border border-black bg-white px-2 py-0.5 text-xs font-bold">
          {result.chainName}
        </span>
      </div>
    </div>
  );
}

