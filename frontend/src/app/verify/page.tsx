'use client';

import { useState, Suspense } from 'react';
import { useReadContract, useChainId } from 'wagmi';
import { CIVITAS_FACTORY_ABI, ENS_L2_RESOLVER_ABI } from '@/lib/contracts/abis';
import {
  CIVITAS_FACTORY_ADDRESS,
  ENS_L2_RESOLVER,
  getCivitasEnsDomain,
  CHAIN_CONFIG,
} from '@/lib/contracts/constants';
import { formatUnits } from 'viem';
import { useSearchParams } from 'next/navigation';
import { Search, Shield, ExternalLink, Copy, Check } from 'lucide-react';
import NavigationRail from '@/components/layout/NavigationRail';
import MarqueeTicker from '@/components/layout/MarqueeTicker';

const RECORD_KEYS = [
  { key: 'contract.type', label: 'Contract Type' },
  { key: 'contract.status', label: 'Status' },
  { key: 'contract.creator', label: 'Creator' },
  { key: 'contract.rent.amount', label: 'Rent Amount', isAmount: true },
  { key: 'contract.rent.dueDate', label: 'Rent Due Date', isDate: true },
  { key: 'contract.escrow.goal', label: 'Escrow Goal', isAmount: true },
  { key: 'contract.escrow.expiry', label: 'Escrow Expiry', isDate: true },
  { key: 'contract.allowance.amount', label: 'Allowance Amount', isAmount: true },
];

function RecordDisplay({
  node,
  recordKey,
  label,
  isAmount,
  isDate,
}: {
  node: `0x${string}`;
  recordKey: string;
  label: string;
  isAmount?: boolean;
  isDate?: boolean;
}) {
  const chainId = useChainId();
  const resolverAddress = ENS_L2_RESOLVER[chainId];

  const { data: value } = useReadContract({
    address: resolverAddress,
    abi: ENS_L2_RESOLVER_ABI,
    functionName: 'text',
    args: [node, recordKey],
    query: { enabled: !!resolverAddress },
  });

  if (!value) return null;

  let displayValue = value;

  if (isAmount) {
    try {
      const formatted = formatUnits(BigInt(value), 6);
      displayValue = parseFloat(formatted).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + ' USDC';
    } catch {
      displayValue = value;
    }
  }

  if (isDate) {
    try {
      const ts = parseInt(value);
      const date = ts > 10000000000 ? new Date(ts) : new Date(ts * 1000);
      displayValue = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch {
      displayValue = value;
    }
  }

  return (
    <div className="flex justify-between items-center border-b-2 border-dashed border-black/20 pb-3 last:border-0 last:pb-0">
      <span className="font-mono text-xs uppercase font-bold text-gray-500">{label}</span>
      <span className="font-mono text-sm font-bold">{displayValue}</span>
    </div>
  );
}

function VerifyByName({ name }: { name: string }) {
  const chainId = useChainId();
  const factoryAddress = CIVITAS_FACTORY_ADDRESS[chainId];
  const [copied, setCopied] = useState(false);
  const ensDomain = getCivitasEnsDomain(chainId);

  // Strip the domain suffix to get the basename for contract lookup
  const basename = name.replace(`.${ensDomain}`, '');

  // Resolve contract address from basename
  const { data: contractAddress, isLoading: isResolving } = useReadContract({
    address: factoryAddress,
    abi: CIVITAS_FACTORY_ABI,
    functionName: 'getContractByBasename',
    args: [basename],
    query: { enabled: !!factoryAddress },
  });

  // Calculate ENS node
  const { data: node } = useReadContract({
    address: factoryAddress,
    abi: CIVITAS_FACTORY_ABI,
    functionName: 'calculateENSNode',
    args: [basename],
    query: { enabled: !!factoryAddress },
  });

  const blockExplorer = CHAIN_CONFIG[chainId as keyof typeof CHAIN_CONFIG]?.blockExplorer || 'https://basescan.org';

  const handleCopy = () => {
    if (contractAddress) {
      navigator.clipboard.writeText(contractAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isResolving) {
    return (
      <div className="bg-white border-4 border-black shadow-[6px_6px_0px_#000] p-8">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-3 border-black border-t-transparent rounded-full animate-spin" />
          <p className="font-display font-bold uppercase">Resolving ENS Name...</p>
        </div>
      </div>
    );
  }

  if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
    return (
      <div className="bg-white border-4 border-black shadow-[6px_6px_0px_#000] p-8">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-hot-pink border-3 border-black flex items-center justify-center">
            <span className="font-headline text-white text-3xl">?</span>
          </div>
          <p className="font-display font-bold text-xl uppercase mb-2">Not Found</p>
          <p className="font-mono text-sm text-gray-500">
            No contract registered for &quot;{name}&quot;
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ENS Identity Card */}
      <div className="bg-acid-lime border-4 border-black shadow-[6px_6px_0px_#000] p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-void-black border-3 border-black flex items-center justify-center">
            <Shield className="w-6 h-6 text-acid-lime" />
          </div>
          <div>
            <p className="font-mono text-xs uppercase font-bold text-black/60">Verified ENS Identity</p>
            <p className="font-display font-bold text-xl uppercase">{name}</p>
          </div>
        </div>

        <div className="bg-white border-3 border-black p-3 flex items-center gap-2">
          <span className="font-mono text-sm flex-1 truncate">{contractAddress}</span>
          <button
            onClick={handleCopy}
            className="p-2 border-2 border-black hover:bg-black hover:text-white transition-colors"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
          <a
            href={`${blockExplorer}/address/${contractAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 border-2 border-black hover:bg-black hover:text-white transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* ENS Records */}
      {node && (
        <div className="bg-white border-4 border-black shadow-[6px_6px_0px_#000] p-6">
          <h2 className="font-display font-bold text-xl uppercase mb-4 pb-3 border-b-3 border-black">
            On-Chain Records
          </h2>
          <div className="space-y-3">
            {RECORD_KEYS.map(({ key, label, isAmount, isDate }) => (
              <RecordDisplay
                key={key}
                node={node as `0x${string}`}
                recordKey={key}
                label={label}
                isAmount={isAmount}
                isDate={isDate}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function VerifyPageContent() {
  const searchParams = useSearchParams();
  const chainId = useChainId();
  const initialName = searchParams.get('name') || '';
  const [searchInput, setSearchInput] = useState(initialName);
  const [activeQuery, setActiveQuery] = useState(initialName);
  const ensDomain = getCivitasEnsDomain(chainId);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveQuery(searchInput.trim());
  };

  return (
    <div className="min-h-screen bg-paper-cream h-screen overflow-hidden relative">
      {/* Navigation Rail */}
      <NavigationRail />

      {/* Main Content Area */}
      <div className="flex flex-col h-full overflow-hidden ml-[88px]">
        {/* Marquee Ticker */}
        <MarqueeTicker />

        {/* Header */}
        <div className="bg-acid-lime border-b-4 border-black px-6 py-3 shrink-0">
          <div className="max-w-3xl">
            <h1 className="font-display font-bold text-xl uppercase tracking-tight text-void-black">
              Verify Contract
            </h1>
            <p className="font-mono text-xs text-void-black/60">
              Look up any Civitas contract by ENS name or address
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-3xl mx-auto">
            {/* Search */}
            <form onSubmit={handleSearch} className="mb-8">
              <div className="flex gap-0">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={`e.g. downtown-studio-a3f9.${ensDomain} or 0x...`}
                  className="flex-1 border-4 border-black border-r-0 px-4 py-3 font-mono text-sm bg-white focus:outline-none focus:ring-2 focus:ring-acid-lime"
                />
                <button
                  type="submit"
                  className="bg-void-black text-white border-4 border-black px-6 py-3 font-display font-bold uppercase hover:bg-acid-lime hover:text-black transition-colors shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px]"
                >
                  <Search className="w-5 h-5" />
                </button>
              </div>
            </form>

            {/* Results */}
            {activeQuery ? (
              <VerifyByName name={activeQuery} />
            ) : (
              <div className="bg-white border-4 border-black shadow-[6px_6px_0px_#000] p-12">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 border-3 border-black/20 flex items-center justify-center">
                    <Shield className="w-10 h-10 text-gray-300" />
                  </div>
                  <p className="font-display font-bold text-2xl uppercase text-gray-300 mb-2">
                    /// Verify ///
                  </p>
                  <p className="font-mono text-sm text-gray-400">
                    Enter an ENS name or contract address to verify
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-paper-cream flex items-center justify-center">
        <div className="font-display font-bold uppercase">Loading...</div>
      </div>
    }>
      <VerifyPageContent />
    </Suspense>
  );
}
