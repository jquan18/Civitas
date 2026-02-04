'use client';

import { useState } from 'react';
import { resolveENSServerSide, type ENSResolutionResult } from '@/lib/ens/resolver';

export default function ENSTestPage() {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ENSResolutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleResolve = async () => {
    if (!input.trim()) return;

    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const resolution = await resolveENSServerSide(input.trim());
      setResult(resolution);
      if (resolution.error) {
        setError(resolution.error);
      }
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-bold text-3xl mb-2">ENS Resolution Test</h1>
        <p className="text-gray-600 mb-8">Debug page for testing ENS resolution</p>

        <div className="bg-white border-[3px] border-black p-6 shadow-[4px_4px_0px_#000]">
          <label className="block font-mono text-sm font-bold mb-2">
            ENS Name or Address
          </label>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g., vitalik.eth, alice.basetest.eth, 0x..."
            className="w-full border-2 border-black p-3 font-mono text-sm mb-4"
            onKeyDown={(e) => e.key === 'Enter' && handleResolve()}
          />

          <button
            onClick={handleResolve}
            disabled={isLoading || !input.trim()}
            className="bg-[#CCFF00] border-[3px] border-black px-6 py-3 font-bold uppercase hover:bg-lime-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Resolving...' : 'Resolve'}
          </button>
        </div>

        {result && (
          <div className="mt-6 bg-white border-[3px] border-black p-6 shadow-[4px_4px_0px_#000]">
            <h2 className="font-bold text-lg mb-4">Resolution Result</h2>

            <div className="space-y-3 font-mono text-sm">
              <div>
                <span className="text-gray-500">Original Input:</span>
                <span className="ml-2 font-bold">{result.originalInput}</span>
              </div>

              <div>
                <span className="text-gray-500">Source:</span>
                <span className="ml-2 font-bold">{result.source}</span>
                <span className="ml-2 text-xs text-gray-400">
                  {result.source === 'l1' && '(Mainnet/Sepolia ENS)'}
                  {result.source === 'l2' && '(Base/Base Sepolia)'}
                  {result.source === 'raw' && '(Raw address)'}
                </span>
              </div>

              <div>
                <span className="text-gray-500">Resolved Address:</span>
                {result.address ? (
                  <div className="mt-1 p-3 bg-green-50 border-2 border-green-500 break-all">
                    <span className="text-green-700 font-bold">{result.address}</span>
                  </div>
                ) : (
                  <div className="mt-1 p-3 bg-red-50 border-2 border-red-500">
                    <span className="text-red-700 font-bold">null (not resolved)</span>
                  </div>
                )}
              </div>

              {result.error && (
                <div>
                  <span className="text-gray-500">Error:</span>
                  <div className="mt-1 p-3 bg-red-50 border-2 border-red-500">
                    <span className="text-red-700">{result.error}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {error && !result && (
          <div className="mt-6 bg-red-50 border-[3px] border-red-500 p-6">
            <h2 className="font-bold text-lg text-red-700 mb-2">Error</h2>
            <p className="text-red-600 font-mono text-sm">{error}</p>
          </div>
        )}

        <div className="mt-8 text-sm text-gray-500">
          <p className="font-bold mb-2">Supported formats:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><code className="bg-gray-100 px-1">vitalik.eth</code> - L1 ENS (Mainnet/Sepolia)</li>
            <li><code className="bg-gray-100 px-1">name.base.eth</code> - L2 Base Name (Mainnet)</li>
            <li><code className="bg-gray-100 px-1">name.basetest.eth</code> - L2 Base Name (Sepolia)</li>
            <li><code className="bg-gray-100 px-1">0x...</code> - Raw Ethereum address</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
