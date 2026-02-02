'use client';

import { useState } from 'react';
import { fetchUserContracts, type RentalContract } from '@/lib/contracts/fetch-contracts';
import NavigationRail from '@/components/layout/NavigationRail';
import MarqueeTicker from '@/components/layout/MarqueeTicker';
import CommandZone from '@/components/dashboard/CommandZone';
import ExecutionZone from '@/components/dashboard/ExecutionZone';
import { useEffect } from 'react';

export default function DashboardPage() {
  const [contracts, setContracts] = useState<RentalContract[]>([]);
  const [selectedContract, setSelectedContract] = useState<RentalContract | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadContracts() {
      try {
        // In a real app, get user address from auth/session
        const userAddress = '0x0000000000000000000000000000000000000000' as `0x${string}`;
        const data = await fetchUserContracts(userAddress);
        setContracts(data);
        if (data.length > 0) {
          setSelectedContract(data[0]);
        }
      } catch (error) {
        console.error('Failed to fetch contracts:', error);
      } finally {
        setLoading(false);
      }
    }
    loadContracts();
  }, []);

  return (
    <div className="min-h-screen bg-paper-cream flex h-screen overflow-hidden">
      {/* Navigation Rail */}
      <NavigationRail />

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col h-full overflow-hidden ml-[88px]">
        {/* Marquee Ticker */}
        <MarqueeTicker />

        {/* Three-Zone Layout */}
        <div className="flex-grow flex flex-col md:flex-row h-full overflow-hidden">
          {/* Command Zone */}
          <CommandZone
            contracts={contracts}
            onSelectContract={setSelectedContract}
            selectedContract={selectedContract}
          />

          {/* Execution Zone */}
          <ExecutionZone contract={selectedContract} />
        </div>
      </div>
    </div>
  );
}
