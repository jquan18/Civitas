'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { WalletGate } from '@/components/wallet/WalletGate';
import { fetchUserContracts, type RentalContract } from '@/lib/contracts/fetch-contracts';
import NavigationRail from '@/components/layout/NavigationRail';
import MarqueeTicker from '@/components/layout/MarqueeTicker';
import CommandZone from '@/components/dashboard/CommandZone';
import ExecutionZone from '@/components/dashboard/ExecutionZone';

// Generic contract type from database
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

// Union type for all contracts
export type AllContracts = RentalContract | GenericContract;

export default function DashboardPage() {
  const { address } = useAccount();
  const [rentalContracts, setRentalContracts] = useState<RentalContract[]>([]);
  const [genericContracts, setGenericContracts] = useState<GenericContract[]>([]);
  const [selectedContract, setSelectedContract] = useState<AllContracts | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch both rental and generic contracts
  useEffect(() => {
    async function loadContracts() {
      if (!address) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch rental contracts (from blockchain)
        const rentalData = await fetchUserContracts(address).catch(() => []);
        setRentalContracts(rentalData);

        // Fetch generic contracts (from database)
        const response = await fetch(`/api/contracts/user/${address}`);
        if (response.ok) {
          const data = await response.json();
          setGenericContracts(data.contracts || []);
        }

        // Auto-select first contract
        if (rentalData.length > 0) {
          setSelectedContract(rentalData[0]);
        }
      } catch (error) {
        console.error('Failed to fetch contracts:', error);
      } finally {
        setLoading(false);
      }
    }

    loadContracts();
  }, [address]);

  // Combine all contracts for the list
  const allContracts = [...rentalContracts, ...genericContracts];

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

          {/* Three-Zone Layout */}
          <div className="flex-grow flex flex-col md:flex-row h-full overflow-hidden">
            {/* Command Zone */}
            <CommandZone
              rentalContracts={rentalContracts}
              genericContracts={genericContracts}
              onSelectContract={setSelectedContract}
              selectedContract={selectedContract}
              loading={loading}
            />

            {/* Execution Zone */}
            <ExecutionZone contract={selectedContract} />
          </div>
        </div>
      </div>
    </WalletGate>
  );
}
