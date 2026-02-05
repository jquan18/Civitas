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
