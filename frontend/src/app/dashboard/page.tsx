'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { WalletGate } from '@/components/wallet/WalletGate';
import NavigationRail from '@/components/layout/NavigationRail';
import MarqueeTicker from '@/components/layout/MarqueeTicker';
import CommandZone from '@/components/dashboard/CommandZone';
import ExecutionZoneRouter from '@/components/dashboard/ExecutionZoneRouter';
import NetworkSwitcher from '@/components/wallet/NetworkSwitcher';

// Contract type from database
interface GenericContract {
  id: string;
  contract_address: string;
  template_id: string;
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

export type AllContracts = GenericContract;

export default function DashboardPage() {
  const { address } = useAccount();
  const [contracts, setContracts] = useState<GenericContract[]>([]);
  const [selectedContract, setSelectedContract] = useState<AllContracts | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [templateFilter, setTemplateFilter] = useState<string>('all');
  const [stateFilter, setStateFilter] = useState<number | 'all'>('all');

  // Function to refresh contracts (can be called manually)
  const syncContracts = async () => {
    if (!address || syncing) return;

    try {
      setSyncing(true);

      // Fetch contracts from database
      const response = await fetch(`/api/contracts/user/${address}`);
      if (response.ok) {
        const data = await response.json();
        setContracts(data.contracts || []);
      }
    } catch (error) {
      console.error('Failed to sync contracts:', error);
    } finally {
      setSyncing(false);
    }
  };

  // Fetch contracts on mount
  useEffect(() => {
    async function loadContracts() {
      if (!address) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch contracts from database
        const response = await fetch(`/api/contracts/user/${address}`);
        if (response.ok) {
          const data = await response.json();
          const fetchedContracts = data.contracts || [];
          setContracts(fetchedContracts);
          
          // Auto-select first contract
          if (fetchedContracts.length > 0) {
            setSelectedContract(fetchedContracts[0]);
          }
        }
      } catch (error) {
        console.error('Failed to fetch contracts:', error);
      } finally {
        setLoading(false);
      }
    }

    loadContracts();
  }, [address]);

  // Filter contracts based on selected filters
  let filteredContracts = [...contracts];

  if (templateFilter !== 'all') {
    filteredContracts = filteredContracts.filter((contract) => {
      return contract.template_id === templateFilter;
    });
  }

  if (stateFilter !== 'all') {
    filteredContracts = filteredContracts.filter((contract) => {
      return contract.state === stateFilter;
    });
  }

  return (
    <WalletGate
      fallbackTitle="Connect to View Dashboard"
      fallbackMessage="Connect your wallet to view and manage your contracts"
    >
      <div className="min-h-screen bg-paper-cream h-screen overflow-hidden relative">
        {/* Navigation Rail */}
        <NavigationRail />

        {/* Main Content Area */}
        <div className="flex flex-col h-full overflow-hidden ml-[88px]">
          {/* Marquee Ticker */}
          <MarqueeTicker />

          {/* Filters Bar */}
          <div className="bg-white border-b-[3px] border-black p-4 flex gap-4 items-center">
            <span className="font-mono text-xs font-bold uppercase">Filters:</span>

            {/* Template Filter */}
            <select
              value={templateFilter}
              onChange={(e) => setTemplateFilter(e.target.value)}
              className="font-mono text-sm border-[2px] border-black px-3 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-[#CCFF00]"
            >
              <option value="all">All Templates</option>
              <option value="rent-vault">Rent Vault</option>
              <option value="group-buy-escrow">Group Buy Escrow</option>
              <option value="stable-allowance-treasury">Allowance Treasury</option>
            </select>

            {/* State Filter */}
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="font-mono text-sm border-[2px] border-black px-3 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-[#CCFF00]"
            >
              <option value="all">All States</option>
              <option value="0">Deployed</option>
              <option value="1">Active</option>
              <option value="2">Completed</option>
              <option value="3">Terminating</option>
              <option value="4">Terminated</option>
            </select>

            {/* Right side controls */}
            <div className="ml-auto flex items-center gap-3">
              {/* Result Count */}
              <div className="bg-acid-lime text-void-black px-3 py-1 border-2 border-black font-mono text-sm font-bold shadow-[2px_2px_0px_#000]">
                {filteredContracts.length} CONTRACTS
              </div>

              {/* Sync Button */}
              <button
                onClick={syncContracts}
                disabled={syncing || !address}
                className={`
                  flex items-center gap-2
                  px-3 py-1.5
                  border-2 border-black
                  shadow-[2px_2px_0px_#000]
                  font-display font-bold text-sm uppercase
                  transition-all
                  ${
                    syncing
                      ? 'bg-gray-300 text-gray-600 cursor-wait'
                      : 'bg-acid-lime text-void-black hover:shadow-[4px_4px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] cursor-pointer'
                  }
                `}
              >
                <svg
                  className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span className="hidden sm:inline">{syncing ? 'Syncing...' : 'Sync'}</span>
              </button>

              {/* Network Switcher - inline version */}
              <NetworkSwitcher inline />
            </div>
          </div>

          {/* Three-Zone Layout */}
          <div className="flex-grow flex flex-col md:flex-row h-full overflow-hidden">
            {/* Command Zone */}
            <CommandZone
              rentalContracts={[]}
              genericContracts={filteredContracts}
              onSelectContract={setSelectedContract}
              selectedContract={selectedContract}
              loading={loading}
            />

            {/* Execution Zone */}
            <ExecutionZoneRouter contract={selectedContract} onSync={syncContracts} />
          </div>
        </div>
      </div>
    </WalletGate>
  );
}
