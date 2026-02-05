'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { WalletGate } from '@/components/wallet/WalletGate';
import NavigationRail from '@/components/layout/NavigationRail';
import MarqueeTicker from '@/components/layout/MarqueeTicker';
import { templateRegistry } from '@/lib/templates/registry';
import { StatusBanner } from '@/components/ui/StatusBanner';
import { formatUnits } from 'viem';
import { ExternalLink, Copy, Check, Shield, RefreshCw, X } from 'lucide-react';
import { CIVITAS_ENS_DOMAIN } from '@/lib/contracts/constants';
import Link from 'next/link';
import { Transaction } from '@/components/transactions/types';
import TransactionList from '@/components/transactions/TransactionList';
import TransactionDetail from '@/components/transactions/TransactionDetail';

interface Contract {
  contract_address: string;
  template_id: string;
  creator_address: string;
  state: number;
  basename?: string;
  config: any;
  on_chain_state?: any;
  created_at: string;
}

const stateLabels = [
  { label: 'Deployed', color: 'bg-gray-400', emoji: '🔴', desc: 'Contract created but not yet activated' },
  { label: 'Active', color: 'bg-[#00FF00]', emoji: '🟢', desc: 'Contract is active and operational' },
  { label: 'Completed', color: 'bg-[#0000FF]', emoji: '✅', desc: 'Contract completed successfully' },
  { label: 'Terminating', color: 'bg-[#FF00FF]', emoji: '🟣', desc: 'Termination in progress' },
  { label: 'Terminated', color: 'bg-black', emoji: '⚫', desc: 'Contract terminated' },
];

export default function ContractDetailPage() {
  const params = useParams();
  const { address: userAddress } = useAccount();
  const contractAddress = params.address as string;

  const [contract, setContract] = useState<Contract | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const [copied, setCopied] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  async function loadContractTransactions() {
    if (!userAddress || !contractAddress) return;
    try {
      setTxLoading(true);
      console.log('[ContractDetail] Fetching transactions for:', { userAddress, contractAddress });
      const response = await fetch(`/api/transactions?user_address=${userAddress}&contract_address=${contractAddress}`);

      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
      } else {
        console.error('[ContractDetail] API Error:', response.statusText);
      }
    } catch (err) {
      console.error('Error loading transactions:', err);
    } finally {
      setTxLoading(false);
    }
  }

  // Initial load of transactions
  useEffect(() => {
    loadContractTransactions();
  }, [userAddress, contractAddress]);

  // Initial load of contract data
  useEffect(() => {
    async function loadContract() {
      if (!contractAddress) return;

      try {
        setLoading(true);
        // We fetch user contracts to ensure we have context, or we could fetch single contract API if available
        // The previous code fetched /api/contracts/user/:address
        const response = await fetch(`/api/contracts/user/${userAddress}`);

        if (response.ok) {
          const data = await response.json();
          const foundContract = data.contracts?.find(
            (c: Contract) => c.contract_address.toLowerCase() === contractAddress.toLowerCase()
          );

          if (foundContract) {
            setContract(foundContract);
          } else {
            // It might be a contract we don't own but have interaction with?
            // Fallback to fetch single contract endpoint from backend
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
            const singleRes = await fetch(`${backendUrl}/api/contracts/${contractAddress}`);
            if (singleRes.ok) {
              const singleData = await singleRes.json();
              setContract(singleData.contract);
            } else {
              setError('Contract not found');
            }
          }
        } else {
          setError('Failed to load contract list');
        }
      } catch (err) {
        console.error('Error loading contract:', err);
        setError('Failed to load contract');
      } finally {
        setLoading(false);
      }
    }

    if (userAddress) {
      loadContract();
    }
  }, [contractAddress, userAddress]);

  const handleSync = async () => {
    if (!contract || isSyncing) return;

    try {
      setIsSyncing(true);
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

      // Trigger backend sync
      const res = await fetch(`${backendUrl}/api/contracts/${contractAddress}/sync`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Sync failed');

      // Refresh transactions list
      await loadContractTransactions();

      // Refresh contract details (e.g. state)
      const detailsRes = await fetch(`${backendUrl}/api/contracts/${contractAddress}`);
      if (detailsRes.ok) {
        const data = await detailsRes.json();
        setContract(data.contract);
      }

    } catch (error) {
      console.error('Manual sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(contractAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatValue = (field: any, value: any) => {
    if (!value && value !== 0) return '---';

    switch (field.type) {
      case 'address':
        return (
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm">
              {value.slice(0, 10)}...{value.slice(-8)}
            </span>
            <a
              href={`https://basescan.org/address/${value}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-70"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        );
      case 'amount':
        try {
          const numValue = typeof value === 'string' ? value : value.toString();
          const formatted = numValue.length > 8
            ? formatUnits(BigInt(numValue), 6)
            : numValue;
          return (
            parseFloat(formatted).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }) + ' USDC'
          );
        } catch {
          return value;
        }
      case 'date':
        try {
          const timestamp = typeof value === 'string' ? parseInt(value) : value;
          const date = timestamp > 10000000000 ? new Date(timestamp) : new Date(timestamp * 1000);
          return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        } catch {
          return value;
        }
      case 'number':
        return value.toString();
      case 'boolean':
        return value ? '✅ Yes' : '❌ No';
      default:
        if (field.format) {
          return field.format(value);
        }
        return String(value);
    }
  };

  if (loading) {
    return (
      <WalletGate>
        <div className="min-h-screen bg-[#FAF9F6] flex">
          <NavigationRail />
          <div className="flex-1 ml-[88px]">
            <MarqueeTicker />
            <div className="flex items-center justify-center h-full">
              <div className="bg-white border-[3px] border-black shadow-[6px_6px_0px_#000] p-12">
                <p className="font-mono font-bold">LOADING CONTRACT...</p>
              </div>
            </div>
          </div>
        </div>
      </WalletGate>
    );
  }

  if (error || !contract) {
    return (
      <WalletGate>
        <div className="min-h-screen bg-[#FAF9F6] flex">
          <NavigationRail />
          <div className="flex-1 ml-[88px]">
            <MarqueeTicker />
            <div className="flex items-center justify-center h-full">
              <div className="bg-white border-[3px] border-black shadow-[6px_6px_0px_#000] p-12">
                <StatusBanner variant="error">
                  {error || 'Contract not found'}
                </StatusBanner>
                <Link href="/dashboard" className="mt-4 inline-block font-mono text-sm underline">
                  ← Back to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </WalletGate>
    );
  }

  const template = templateRegistry.get(contract.template_id);
  if (!template) {
    return (
      <WalletGate>
        <div className="min-h-screen bg-[#FAF9F6] flex">
          <NavigationRail />
          <div className="flex-1 ml-[88px]">
            <MarqueeTicker />
            <div className="p-8">
              <StatusBanner variant="error">
                Unknown template: {contract.template_id}
              </StatusBanner>
            </div>
          </div>
        </div>
      </WalletGate>
    );
  }

  const stateInfo = stateLabels[contract.state] || stateLabels[0];
  const displayData = { ...contract.config, ...contract.on_chain_state };
  const userRoles = userAddress ? template.getUserRole(userAddress, displayData) : [];

  return (
    <WalletGate>
      <div className="min-h-screen bg-[#FAF9F6] flex">
        <NavigationRail />

        <div className="flex-1 ml-[88px] overflow-y-auto">
          <MarqueeTicker />

          <div className="p-8 max-w-5xl mx-auto">
            {/* Back Button */}
            <Link
              href="/dashboard"
              className="inline-block mb-6 font-mono text-sm font-bold uppercase hover:underline"
            >
              ← Back to Dashboard
            </Link>

            {/* Header */}
            <div className="bg-white border-[3px] border-black shadow-[6px_6px_0px_#000] p-6 mb-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="font-black text-3xl uppercase tracking-tight mb-2">
                    {template.name}
                  </h1>
                  <p className="font-mono text-sm opacity-60">
                    {contract.template_id}
                  </p>
                </div>

                <div
                  className={`${stateInfo.color} border-2 border-black px-4 py-2 text-white font-mono text-sm font-bold`}
                >
                  {stateInfo.emoji} {stateInfo.label}
                </div>
              </div>

              {/* Contract Address */}
              <div className="bg-[#FAF9F6] border-2 border-black p-3 flex items-center gap-2">
                <span className="font-mono text-sm flex-1">
                  {contract.contract_address}
                </span>
                <button
                  onClick={handleCopy}
                  className="p-2 hover:bg-black hover:text-white transition-colors"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
                <a
                  href={`https://basescan.org/address/${contract.contract_address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-black hover:text-white transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              {/* ENS Identity */}
              <div className="mt-4">
                {contract.basename ? (
                  <div className="bg-[#CCFF00] border-2 border-black px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        <div>
                          <p className="font-mono text-xs uppercase font-bold opacity-60">ENS Identity</p>
                          <p className="font-mono text-sm font-bold">
                            {contract.basename}.{CIVITAS_ENS_DOMAIN}
                          </p>
                        </div>
                      </div>
                      <Link
                        href={`/verify?name=${contract.basename}.${CIVITAS_ENS_DOMAIN}`}
                        className="font-mono text-xs font-bold underline hover:no-underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Verify
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#FAF9F6] border-2 border-dashed border-black px-4 py-3">
                    <p className="font-mono text-xs opacity-40">ENS subdomain not registered</p>
                  </div>
                )}
              </div>

              {/* User Roles */}
              {userRoles.length > 0 && (
                <div className="mt-4 flex gap-2">
                  <span className="font-mono text-xs font-bold uppercase">Your Roles:</span>
                  {userRoles.map((role) => (
                    <span
                      key={role}
                      className="bg-[#CCFF00] border-2 border-black px-3 py-1 font-mono text-xs uppercase font-bold"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Parameters Section */}
            <div className="bg-white border-[3px] border-black shadow-[6px_6px_0px_#000] p-6 mb-6">
              <h2 className="font-black text-xl uppercase mb-4">PARAMETERS</h2>
              <div className="space-y-4">
                {template.dashboardFields.map((field) => {
                  const value = displayData[field.key];
                  return (
                    <div key={field.key} className="border-b border-dashed border-black pb-4 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <span className="font-mono text-xs uppercase font-bold opacity-60 block mb-1">
                            {field.label}
                          </span>
                          {field.description && (
                            <span className="font-mono text-xs opacity-40 block">
                              {field.description}
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-sm font-bold text-right">
                          {formatValue(field, value)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions Section */}
            <div className="bg-white border-[3px] border-black shadow-[6px_6px_0px_#000] p-6 mb-6">
              <h2 className="font-black text-xl uppercase mb-4">ACTIONS</h2>
              <div className="space-y-3">
                {template.actionButtons.map((action) => {
                  const hasRequiredRole = !action.requiresRole || action.requiresRole.some(r => userRoles.includes(r));
                  const isEnabled = !action.enabledWhen || action.enabledWhen(displayData);
                  const canPerform = hasRequiredRole && isEnabled;

                  return (
                    <div key={action.id} className="border-2 border-black">
                      <button
                        disabled={!canPerform}
                        className={`
                          w-full p-4 text-left transition-all
                          ${canPerform
                            ? 'bg-[#CCFF00] hover:bg-[#FFD600] cursor-pointer'
                            : 'bg-gray-200 cursor-not-allowed opacity-50'
                          }
                        `}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-black text-lg uppercase mb-1">
                              {action.label}
                            </h3>
                            <p className="font-mono text-xs opacity-60">
                              {action.description}
                            </p>
                            {action.requiresRole && (
                              <p className="font-mono text-xs mt-2 opacity-40">
                                Requires: {action.requiresRole.join(', ')}
                              </p>
                            )}
                          </div>
                          {canPerform && (
                            <span className="font-black text-xl">&gt;&gt;&gt;</span>
                          )}
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 bg-[#FFD600] border-2 border-black p-3">
                <p className="font-mono text-xs">
                  <span className="font-black">[NOTE]</span> Contract interactions will be fully enabled in the next update. This page currently displays read-only information.
                </p>
              </div>
            </div>

            {/* Transaction History Section */}
            <div className="bg-white border-[3px] border-black shadow-[6px_6px_0px_#000] p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-black text-xl uppercase flex items-center gap-4">
                  <span>Transaction History</span>
                  <span className="text-sm font-mono opacity-60 normal-case bg-gray-100 px-2 py-1 border border-black rounded">
                    {transactions.length} Events
                  </span>
                </h2>
                <button
                  onClick={handleSync}
                  disabled={isSyncing}
                  className={`
                    px-4 py-2
                    border-2 border-black
                    font-bold uppercase
                    text-xs md:text-sm
                    flex items-center gap-2
                    shadow-[4px_4px_0px_#000]
                    transition-all
                    ${isSyncing
                      ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                      : 'bg-white hover:bg-acid-lime active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_#000]'}
                  `}
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </button>
              </div>

              <TransactionList
                transactions={transactions}
                loading={txLoading}
                isConnected={!!userAddress}
                onSelectTransaction={(tx) => {
                  console.log('Selected transaction:', tx);
                  setSelectedTx(tx);
                }}
                emptyMessage="No Contract Activity"
                showCreateLink={false}
              />
            </div>
          </div>
        </div>

        {/* Transaction Detail Modal */}
        {selectedTx && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setSelectedTx(null)}
              aria-hidden="true"
            />
            <div className="relative w-full max-w-4xl h-[90vh] z-[101] bg-paper-cream border-[4px] border-black shadow-[8px_8px_0px_#000] flex flex-col">
              <div className="flex justify-between items-center p-4 border-b-4 border-black bg-stark-white shrink-0">
                <h2 className="font-black text-xl uppercase">Transaction Details</h2>
                <button
                  onClick={() => setSelectedTx(null)}
                  className="p-2 hover:bg-black hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 overflow-auto bg-paper-cream">
                <TransactionDetail event={selectedTx} />
              </div>
            </div>
          </div>
        )}
      </div>
    </WalletGate>
  );
}
