'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import AppLayout from '@/components/layout/AppLayout';
import WalletInfoCard from '@/components/wallet/WalletInfoCard';
import BalanceCard from '@/components/wallet/BalanceCard';
import ChainSelector from '@/components/wallet/ChainSelector';
import ContractSummaryCard from '@/components/wallet/ContractSummaryCard';
import { useMultiChainBalances } from '@/hooks/useMultiChainBalances';
import { useNetworkMode } from '@/contexts/NetworkModeContext';
import Link from 'next/link';
import { formatUnits } from 'viem';

const SUPPORTED_CHAINS = [
  { id: 8453, name: 'Base', supported: true },
  { id: 1, name: 'Ethereum', supported: true },
  { id: 137, name: 'Polygon', supported: false },
  { id: 42161, name: 'Arbitrum', supported: false },
];

// Helper to extract balance value from wagmi's useBalance return type
const getBalanceValue = (data: unknown): bigint | undefined => {
  if (data && typeof data === 'object' && 'value' in data) {
    return (data as { value: bigint }).value;
  }
  return undefined;
};

export default function WalletPage() {
  const { address, isConnected } = useAccount();
  const { networkMode } = useNetworkMode();
  const balances = useMultiChainBalances(address, networkMode);
  const [activeChain, setActiveChain] = useState(
    networkMode === 'mainnet' ? 8453 : 84532
  );
  const [contractStats, setContractStats] = useState({ activeCount: 0, totalLocked: '0.00' });
  const [statsLoading, setStatsLoading] = useState(true);

  // Fetch contract stats
  useEffect(() => {
    async function fetchStats() {
      if (!address) {
        setStatsLoading(false);
        return;
      }

      try {
        // This would query Supabase for active contracts
        // For now, using mock data
        setContractStats({
          activeCount: 0,
          totalLocked: '0.00',
        });
      } catch (error) {
        console.error('Error fetching contract stats:', error);
      } finally {
        setStatsLoading(false);
      }
    }

    fetchStats();
  }, [address]);

  const commandZone = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b-4 border-black bg-stark-white shrink-0">
        <h2 className="font-headline text-2xl uppercase tracking-tighter mb-2">
          Wallet Overview
        </h2>
        <div className="flex gap-2 items-center">
          <span className={`text-xs font-display font-bold px-2 py-1 border-2 ${networkMode === 'mainnet'
            ? 'bg-acid-lime text-black border-black'
            : 'bg-hot-pink text-white border-black'
            }`}>
            {networkMode.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {!isConnected ? (
          <div className="text-center my-12">
            <div className="bg-stark-white border-4 border-black shadow-[8px_8px_0px_#000] p-12 inline-block">
              <p className="font-display font-bold text-black mb-4 uppercase">
                Wallet Not Connected
              </p>
              <p className="font-display text-sm text-gray-600">
                Connect your wallet to view balances
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Wallet Info */}
            {address && (
              <WalletInfoCard
                address={address}
                ensName={null} // TODO: Add ENS resolution
                isConnected={isConnected}
              />
            )}

            {/* Chain Selector */}
            <ChainSelector
              chains={SUPPORTED_CHAINS}
              activeChain={activeChain}
              onSelect={setActiveChain}
            />

            {/* Contract Summary */}
            <ContractSummaryCard
              activeCount={contractStats.activeCount}
              totalLocked={contractStats.totalLocked}
              isLoading={statsLoading}
            />

            {/* Quick Actions */}
            <div className="space-y-3">
              <h3 className="font-display font-bold text-xs uppercase text-gray-600">
                Quick Actions
              </h3>
              <Link
                href="/create"
                className="block w-full bg-hot-pink text-white border-2 border-black px-4 py-3 font-display font-bold uppercase shadow-[4px_4px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000] transition-all text-center cursor-pointer"
              >
                Create Contract
              </Link>
              <Link
                href="/dashboard"
                className="block w-full bg-stark-white text-black border-2 border-black px-4 py-3 font-display font-bold uppercase shadow-[4px_4px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000] transition-all text-center cursor-pointer"
              >
                View Dashboard
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );

  const executionZone = (
    <div className="h-full overflow-auto p-6 md:p-12">
      {!isConnected ? (
        <div className="flex items-center justify-center h-full">
          <div className="bg-stark-white border-4 border-black shadow-[8px_8px_0px_#000] p-12 text-center">
            <p className="font-headline text-2xl uppercase mb-4">Connect Wallet</p>
            <p className="font-display text-gray-600">
              Connect your wallet to view balances
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6 max-w-3xl mx-auto">
          <h2 className="font-headline text-3xl uppercase mb-6">
            {SUPPORTED_CHAINS.find((c) => c.id === activeChain)?.name} Balances
          </h2>

          {/* Balance Cards */}
          <div className="space-y-4">
            {networkMode === 'mainnet' ? (
              <>
                {activeChain === 8453 && (
                  <>
                    <BalanceCard
                      token="ETH"
                      balance={getBalanceValue(balances.mainnet.base.eth.data)}
                      decimals={18}
                      chainName="Base"
                      isLoading={balances.mainnet.base.eth.isLoading}
                      isError={balances.mainnet.base.eth.isError}
                      error={balances.mainnet.base.eth.error}
                    />
                    <BalanceCard
                      token="USDC"
                      balance={getBalanceValue(balances.mainnet.base.usdc.data)}
                      decimals={6}
                      chainName="Base"
                      isLoading={balances.mainnet.base.usdc.isLoading}
                      isError={balances.mainnet.base.usdc.isError}
                      error={balances.mainnet.base.usdc.error}
                    />
                  </>
                )}

                {activeChain === 1 && (
                  <>
                    <BalanceCard
                      token="ETH"
                      balance={getBalanceValue(balances.mainnet.ethereum.eth.data)}
                      decimals={18}
                      chainName="Ethereum"
                      isLoading={balances.mainnet.ethereum.eth.isLoading}
                      isError={balances.mainnet.ethereum.eth.isError}
                      error={balances.mainnet.ethereum.eth.error}
                    />
                    <BalanceCard
                      token="USDC"
                      balance={getBalanceValue(balances.mainnet.ethereum.usdc.data)}
                      decimals={6}
                      chainName="Ethereum"
                      isLoading={balances.mainnet.ethereum.usdc.isLoading}
                      isError={balances.mainnet.ethereum.usdc.isError}
                      error={balances.mainnet.ethereum.usdc.error}
                    />
                  </>
                )}
              </>
            ) : (
              <>
                {/* Testnet - Base Sepolia */}
                <BalanceCard
                  token="ETH"
                  balance={getBalanceValue(balances.testnet.baseSepolia.eth.data)}
                  decimals={18}
                  chainName="Base Sepolia"
                  isLoading={balances.testnet.baseSepolia.eth.isLoading}
                  isError={balances.testnet.baseSepolia.eth.isError}
                  error={balances.testnet.baseSepolia.eth.error}
                />
                <BalanceCard
                  token="USDC"
                  balance={getBalanceValue(balances.testnet.baseSepolia.usdc.data)}
                  decimals={6}
                  chainName="Base Sepolia"
                  isLoading={balances.testnet.baseSepolia.usdc.isLoading}
                  isError={balances.testnet.baseSepolia.usdc.isError}
                  error={balances.testnet.baseSepolia.usdc.error}
                />
              </>
            )}
          </div>

          {/* Additional Info */}
          <div className="mt-8 p-6 bg-stark-white border-4 border-black shadow-[8px_8px_0px_#000]">
            <h3 className="font-headline text-xl uppercase mb-4">Network Info</h3>
            <div className="space-y-2 font-display text-sm">
              <p>
                <span className="font-bold">Active Chain:</span>{' '}
                {SUPPORTED_CHAINS.find((c) => c.id === activeChain)?.name}
              </p>
              <p>
                <span className="font-bold">Chain ID:</span> {activeChain}
              </p>
              <p className="text-gray-600 text-xs mt-4">
                Balances update automatically on new blocks
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return <AppLayout activeNavItem="wallet" commandZone={commandZone} executionZone={executionZone} />;
}
