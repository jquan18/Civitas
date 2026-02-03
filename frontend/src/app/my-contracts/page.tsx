'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import {
  getTemplateInfo,
  getContractState,
  getConfigDisplayFields,
  formatAddress,
  getExplorerUrl,
  getChainName,
} from '@/lib/contracts/template-utils';
import { CONTRACT_TEMPLATES, type ContractTemplate } from '@/lib/contracts/constants';

interface Contract {
  id: string;
  contract_address: string;
  template_id: ContractTemplate;
  creator_address: string;
  chain_id: number;
  state: number;
  basename: string | null;
  config: any;
  on_chain_state: any | null;
  created_at: string | null;
  updated_at: string | null;
  last_synced_at: string | null;
}

export default function MyContractsPage() {
  const { address, isConnected } = useAccount();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<ContractTemplate | 'all'>('all');

  // Fetch user contracts
  useEffect(() => {
    if (!address) {
      setIsLoading(false);
      return;
    }

    const fetchContracts = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/contracts/user/${address}`);
        if (!response.ok) {
          throw new Error('Failed to fetch contracts');
        }

        const data = await response.json();
        setContracts(data.contracts || []);
      } catch (err: any) {
        console.error('Error fetching contracts:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContracts();
  }, [address]);

  // Filter contracts by template
  const filteredContracts = selectedFilter === 'all'
    ? contracts
    : contracts.filter(c => c.template_id === selectedFilter);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">My Contracts</h1>
          <p className="text-gray-600 mb-6">Please connect your wallet to view your contracts</p>
          <Link
            href="/test-contract"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            Go to Test Contract Page
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">My Contracts</h1>
              <p className="text-gray-600 mt-2">
                Manage your deployed Civitas contracts
              </p>
            </div>
            <Link
              href="/test-contract"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition"
            >
              + Deploy New Contract
            </Link>
          </div>

          {/* Connected Address */}
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Connected Address</p>
            <p className="font-mono text-sm text-gray-900">{address}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-700">Filter:</span>
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                selectedFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({contracts.length})
            </button>
            <button
              onClick={() => setSelectedFilter(CONTRACT_TEMPLATES.RENT_VAULT)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                selectedFilter === CONTRACT_TEMPLATES.RENT_VAULT
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🏠 Rent Vault ({contracts.filter(c => c.template_id === CONTRACT_TEMPLATES.RENT_VAULT).length})
            </button>
            <button
              onClick={() => setSelectedFilter(CONTRACT_TEMPLATES.GROUP_BUY_ESCROW)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                selectedFilter === CONTRACT_TEMPLATES.GROUP_BUY_ESCROW
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🤝 Group Buy ({contracts.filter(c => c.template_id === CONTRACT_TEMPLATES.GROUP_BUY_ESCROW).length})
            </button>
            <button
              onClick={() => setSelectedFilter(CONTRACT_TEMPLATES.STABLE_ALLOWANCE_TREASURY)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                selectedFilter === CONTRACT_TEMPLATES.STABLE_ALLOWANCE_TREASURY
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              💰 Allowance ({contracts.filter(c => c.template_id === CONTRACT_TEMPLATES.STABLE_ALLOWANCE_TREASURY).length})
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading contracts...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600 font-semibold mb-2">Error loading contracts</p>
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredContracts.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📄</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {selectedFilter === 'all' ? 'No contracts yet' : 'No contracts found'}
            </h3>
            <p className="text-gray-600 mb-6">
              {selectedFilter === 'all'
                ? 'Deploy your first contract to get started'
                : `You haven't deployed any ${getTemplateInfo(selectedFilter as ContractTemplate).name} contracts yet`}
            </p>
            <Link
              href="/test-contract"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition"
            >
              Deploy Contract
            </Link>
          </div>
        )}

        {/* Contracts Grid */}
        {!isLoading && !error && filteredContracts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContracts.map((contract) => (
              <ContractCard key={contract.id} contract={contract} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Contract Card Component
function ContractCard({ contract }: { contract: Contract }) {
  const templateInfo = getTemplateInfo(contract.template_id);
  const stateInfo = getContractState(contract.state);
  const configFields = getConfigDisplayFields(contract.template_id, contract.config);
  const explorerUrl = getExplorerUrl(contract.chain_id, contract.contract_address);

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{templateInfo.icon}</span>
          <div>
            <h3 className="font-semibold text-gray-900">{templateInfo.name}</h3>
            <p className="text-xs text-gray-500">{getChainName(contract.chain_id)}</p>
          </div>
        </div>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            stateInfo.color === 'green'
              ? 'bg-green-100 text-green-700'
              : stateInfo.color === 'blue'
              ? 'bg-blue-100 text-blue-700'
              : stateInfo.color === 'purple'
              ? 'bg-purple-100 text-purple-700'
              : stateInfo.color === 'red'
              ? 'bg-red-100 text-red-700'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          {stateInfo.emoji} {stateInfo.label}
        </span>
      </div>

      {/* Contract Address */}
      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-1">Contract Address</p>
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs text-blue-600 hover:underline break-all"
        >
          {formatAddress(contract.contract_address)}
        </a>
      </div>

      {/* Config Fields */}
      <div className="border-t pt-4 space-y-2">
        {Object.entries(configFields).map(([key, value]) => (
          <div key={key}>
            <p className="text-xs text-gray-500">{key}</p>
            <p className="text-sm text-gray-900 font-mono break-all">
              {typeof value === 'string' && value.startsWith('0x')
                ? formatAddress(value)
                : value}
            </p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t mt-4 pt-4 flex items-center justify-between">
        <p className="text-xs text-gray-500">
          Created {contract.created_at ? new Date(contract.created_at).toLocaleDateString() : 'N/A'}
        </p>
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline font-medium"
        >
          View on Explorer →
        </a>
      </div>
    </div>
  );
}
