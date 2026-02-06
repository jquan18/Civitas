'use client';

import { useState, Suspense, useEffect } from 'react';
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
import { Search, Shield, ExternalLink, Copy, Check, ChevronDown, User, FileQuestion } from 'lucide-react';
import NavigationRail from '@/components/layout/NavigationRail';
import MarqueeTicker from '@/components/layout/MarqueeTicker';
import { resolveENSServerSide, isENSName, isAddress } from '@/lib/ens/resolver';

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

function VerifyByName({ name, selectedChainId }: { name: string; selectedChainId: number }) {
  const chainId = useChainId();
  const factoryAddress = CIVITAS_FACTORY_ADDRESS[selectedChainId];
  const [copied, setCopied] = useState(false);
  const [isResolvingENS, setIsResolvingENS] = useState(false);
  const [resolutionError, setResolutionError] = useState<string | null>(null);
  const [processedInput, setProcessedInput] = useState<{
    basename: string;
    displayName: string;
  } | null>(null);
  const ensDomain = getCivitasEnsDomain(selectedChainId);

  // Process input on mount or when name/selectedChainId changes
  useEffect(() => {
    const processInput = async () => {
      setIsResolvingENS(true);
      setResolutionError(null);
      setProcessedInput(null);

      try {
        // Case 1: Raw address - use directly for lookup
        if (isAddress(name)) {
          setProcessedInput({
            basename: name,
            displayName: name,
          });
          setIsResolvingENS(false);
          return;
        }


        // Case 1.5: Full Civitas ENS domain - extract basename directly
        const expectedDomain = getCivitasEnsDomain(selectedChainId);
        const domainSuffix = `.${expectedDomain}`;

        if (name.toLowerCase().endsWith(domainSuffix.toLowerCase())) {
          const basename = name.slice(0, -domainSuffix.length);
          setProcessedInput({
            basename: basename,
            displayName: name,
          });
          setIsResolvingENS(false);
          return;
        }

        // Case 2: Full ENS name - resolve to address first
        if (isENSName(name)) {
          // Resolve ENS name via server-side (supports all ENS types)
          const resolution = await resolveENSServerSide(name);

          if (!resolution.address) {
            setResolutionError(resolution.error || 'ENS name could not be resolved');
            setIsResolvingENS(false);
            return;
          }

          // Use the resolved address for contract lookup
          // Store the ENS name as display name for better UX
          setProcessedInput({
            basename: resolution.address, // Use address for lookup
            displayName: name, // Keep ENS name for display
          });
          setIsResolvingENS(false);
          return;
        }

        // Case 3: Basename only - assume Civitas basename, append domain
        setProcessedInput({
          basename: name,
          displayName: `${name}.${expectedDomain}`,
        });
        setIsResolvingENS(false);
      } catch (error: any) {
        console.error('Input processing error:', error);
        setResolutionError(error.message || 'Failed to process input');
        setIsResolvingENS(false);
      }
    };

    processInput();
  }, [name, selectedChainId, ensDomain]);

  // Resolve contract address from basename
  const { data: contractAddress, isLoading: isResolving } = useReadContract({
    address: factoryAddress,
    abi: CIVITAS_FACTORY_ABI,
    functionName: 'getContractByBasename',
    args: processedInput ? [processedInput.basename] : undefined,
    query: { enabled: !!processedInput && !!factoryAddress },
  });

  // Calculate ENS node
  const { data: node } = useReadContract({
    address: factoryAddress,
    abi: CIVITAS_FACTORY_ABI,
    functionName: 'calculateENSNode',
    args: processedInput ? [processedInput.basename] : undefined,
    query: { enabled: !!processedInput && !!factoryAddress },
  });

  const blockExplorer = CHAIN_CONFIG[selectedChainId as keyof typeof CHAIN_CONFIG]?.blockExplorer || 'https://basescan.org';

  const handleCopy = () => {
    if (contractAddress) {
      navigator.clipboard.writeText(contractAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isResolvingENS) {
    return (
      <div className="bg-white border-4 border-black shadow-[6px_6px_0px_#000] p-8">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-3 border-black border-t-transparent rounded-full animate-spin" />
          <p className="font-display font-bold uppercase">Resolving ENS Name...</p>
        </div>
      </div>
    );
  }

  if (resolutionError) {
    return (
      <div className="bg-white border-4 border-black shadow-[6px_6px_0px_#000] p-8">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-warning-yellow border-3 border-black flex items-center justify-center">
            <span className="font-headline text-black text-3xl">!</span>
          </div>
          <p className="font-display font-bold text-xl uppercase mb-2">Resolution Error</p>
          <p className="font-mono text-sm text-gray-600">{resolutionError}</p>
        </div>
      </div>
    );
  }

  if (isResolving) {
    return (
      <div className="bg-white border-4 border-black shadow-[6px_6px_0px_#000] p-8">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-3 border-black border-t-transparent rounded-full animate-spin" />
          <p className="font-display font-bold uppercase">Looking up contract...</p>
        </div>
      </div>
    );
  }

  if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
    // CASE: User Resolved, but No Contract Found
    if (processedInput?.basename) {
      return (
        <div className="space-y-6">
          {/* 1. Identity Verified Card (Success State) */}
          <div className="bg-acid-lime border-4 border-black shadow-[6px_6px_0px_#000] p-6 relative overflow-hidden">
            <div className="flex items-center gap-4 mb-6 relative z-10">
              <div className="w-12 h-12 bg-white border-3 border-black flex items-center justify-center">
                <User className="w-6 h-6 text-black" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-xs uppercase font-bold text-black/60">Identity Verified</p>
                  <div className="bg-black !text-white text-[10px] font-bold px-1.5 py-0.5 uppercase tracking-wider">Valid</div>
                </div>
                <p className="font-display font-bold text-xl uppercase">{processedInput.displayName}</p>
              </div>
            </div>

            {/* Resolved Address */}
            <div className="bg-white/60 border-3 border-black p-3 relative z-10">
              <p className="font-mono text-[10px] uppercase font-bold text-black/50 mb-1">Resolved Wallet Address</p>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm flex-1 truncate">{processedInput.basename}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(processedInput.basename);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="p-1.5 border-2 border-black hover:bg-black hover:text-white transition-colors cursor-pointer bg-white"
                  title="Copy Address"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <a
                  href={`${blockExplorer}/address/${processedInput.basename}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 border-2 border-black hover:bg-black hover:text-white transition-colors cursor-pointer bg-white"
                  title="View on Explorer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* 2. No Contract Notice (Info State) */}
          <div className="bg-white border-4 border-black border-dashed p-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 border-3 border-black/30 flex items-center justify-center">
                <FileQuestion className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="font-display font-bold text-xl uppercase mb-2 text-gray-800">No Contract Found</h3>
              <p className="font-mono text-sm text-gray-500 max-w-md mx-auto mb-6">
                This address exists but hasn't deployed a Civitas rental agreement yet.
              </p>

              <div className="inline-block bg-gray-100 border-2 border-black px-4 py-2 font-mono text-xs text-gray-500">
                Status: 0 Contracts Deployed
              </div>
            </div>
          </div>
        </div>
      );
    }

    // CASE: Not Found (Invalid Input / Unknown)
    return (
      <div className="bg-white border-4 border-black shadow-[6px_6px_0px_#000] p-8">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-hot-pink border-3 border-black flex items-center justify-center">
            <span className="font-headline text-white text-3xl">?</span>
          </div>
          <p className="font-display font-bold text-xl uppercase mb-2">Not Found</p>
          <p className="font-mono text-sm text-gray-500">
            No contract registered for &quot;{processedInput?.displayName || name}&quot;
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
            <p className="font-display font-bold text-xl uppercase">{processedInput?.displayName || name}</p>
          </div>
        </div>

        {/* User Address (Resolved) */}
        {processedInput?.basename && (
          <div className="mb-4">
            <p className="font-mono text-xs uppercase font-bold text-black/60 mb-1">Resolved User Address</p>
            <div className="font-mono text-sm break-all select-all bg-white/40 p-2 border border-black/20">
              {processedInput.basename}
            </div>
          </div>
        )}

        <div className="bg-white border-3 border-black p-3 flex items-center gap-2">
          <span className="font-mono text-sm flex-1 truncate">{contractAddress}</span>
          <button
            onClick={handleCopy}
            className="p-2 border-2 border-black hover:bg-black hover:text-white transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
          <a
            href={`${blockExplorer}/address/${contractAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 border-2 border-black hover:bg-black hover:text-white transition-colors cursor-pointer"
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
  const [selectedChainId, setSelectedChainId] = useState(chainId);
  const [networkDropdownOpen, setNetworkDropdownOpen] = useState(false);
  const ensDomain = getCivitasEnsDomain(selectedChainId);

  // Update selectedChainId when wallet network changes
  useEffect(() => {
    setSelectedChainId(chainId);
  }, [chainId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveQuery(searchInput.trim());
  };

  const networks = [
    { id: 84532, name: 'Base Sepolia', domain: 'basetest.eth' },
    { id: 8453, name: 'Base Mainnet', domain: 'base.eth' },
  ];

  const selectedNetwork = networks.find(n => n.id === selectedChainId) || networks[0];

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
            {/* Search with Network Selector */}
            <form onSubmit={handleSearch} className="mb-8">
              <div className="flex gap-0">
                {/* Network Selector Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setNetworkDropdownOpen(!networkDropdownOpen)}
                    className="border-4 border-black border-r-0 px-4 py-3 font-mono text-sm uppercase bg-white hover:bg-acid-lime transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap"
                  >
                    <span className="font-bold">{selectedNetwork.name}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${networkDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {networkDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-full min-w-[200px] bg-white border-4 border-black shadow-[4px_4px_0px_#000] z-10">
                      {networks.map((network) => (
                        <button
                          key={network.id}
                          type="button"
                          onClick={() => {
                            setSelectedChainId(network.id);
                            setNetworkDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-3 font-mono text-sm uppercase hover:bg-acid-lime transition-colors cursor-pointer ${selectedChainId === network.id ? 'bg-acid-lime font-bold' : ''
                            }`}
                        >
                          <div className="font-bold">{network.name}</div>
                          <div className="text-xs text-gray-500 normal-case">.{network.domain}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Search Input */}
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={`e.g. papajohnny.basetest.eth, downtown-studio-a3f9, or 0x...`}
                  className="flex-1 border-4 border-black border-r-0 px-4 py-3 font-mono text-sm bg-white focus:outline-none focus:ring-2 focus:ring-acid-lime"
                />

                {/* Search Button */}
                <button
                  type="submit"
                  className="bg-void-black text-white border-4 border-black px-6 py-3 font-display font-bold uppercase hover:bg-acid-lime hover:text-black transition-colors shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] cursor-pointer"
                >
                  <Search className="w-5 h-5" />
                </button>
              </div>
            </form>

            {/* Results */}
            {activeQuery ? (
              <VerifyByName name={activeQuery} selectedChainId={selectedChainId} />
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
