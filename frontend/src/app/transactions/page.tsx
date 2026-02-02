'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import AppLayout from '@/components/layout/AppLayout';
import TransactionCard from '@/components/transactions/TransactionCard';
import TransactionDetail from '@/components/transactions/TransactionDetail';
import { ChevronDown } from 'lucide-react';
import Link from 'next/link';

interface Transaction {
  id: string;
  event_type: 'created' | 'activated' | 'rent_released' | 'termination_initiated' | 'terminated' | 'completed';
  contract_address: string;
  basename: string | null;
  transaction_hash: string;
  block_number: number;
  event_data: any;
  created_at: string;
  role?: string;
}

const EVENT_TYPE_FILTERS = [
  { value: 'all', label: 'All Events' },
  { value: 'created', label: 'Deployments' },
  { value: 'activated', label: 'Activations' },
  { value: 'rent_released', label: 'Rent Releases' },
  { value: 'termination_initiated', label: 'Terminations' },
  { value: 'completed', label: 'Completed' },
] as const;

export default function TransactionsPage() {
  const { address, isConnected } = useAccount();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    async function fetchTransactions() {
      if (!address) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/transactions?user_address=${address}`);
        if (!response.ok) throw new Error('Failed to fetch transactions');

        const data = await response.json();
        setTransactions(data.transactions || []);

        if (data.transactions?.length > 0) {
          setSelectedTransaction(data.transactions[0]);
        }
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchTransactions();
  }, [address]);

  // Client-side filtering
  const filteredTransactions = filter === 'all'
    ? transactions
    : transactions.filter(tx => tx.event_type === filter);

  const commandZone = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b-4 border-black bg-stark-white shrink-0">
        <h2 className="font-headline text-2xl uppercase tracking-tighter mb-4">
          Transaction History
        </h2>

        {/* Filter Dropdown */}
        <div className="relative">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full bg-paper-cream border-2 border-black px-4 py-2 font-display font-bold text-sm uppercase appearance-none cursor-pointer focus:outline-none focus:shadow-[4px_4px_0px_#000] transition-shadow pr-10"
          >
            {EVENT_TYPE_FILTERS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none" />
        </div>

        {/* Live Feed Badge */}
        <div className="flex gap-2 items-center mt-3">
          <span className="text-xs font-display font-bold bg-void-black text-acid-lime px-2 py-1 border border-acid-lime">
            LIVE FEED
          </span>
          <span className="w-3 h-3 bg-red-500 border-2 border-black"></span>
        </div>
      </div>

      {/* Transaction List */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {!isConnected ? (
          <div className="text-center my-12">
            <div className="bg-stark-white border-4 border-black shadow-[8px_8px_0px_#000] p-12 inline-block">
              <p className="font-display font-bold text-black mb-4">WALLET NOT CONNECTED</p>
              <p className="font-display text-sm text-gray-600">
                Connect your wallet to view transactions
              </p>
            </div>
          </div>
        ) : loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-stark-white border-[3px] border-black shadow-[4px_4px_0px_#000] p-4 h-32 animate-pulse"
              />
            ))}
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center my-12">
            <div className="bg-stark-white border-4 border-black shadow-[8px_8px_0px_#000] p-12 inline-block">
              <p className="font-display font-bold text-black mb-4 uppercase">No Transactions Yet</p>
              <p className="font-display text-sm text-gray-600 mb-6">
                Create your first rental contract to see transactions here
              </p>
              <Link
                href="/create"
                className="inline-block bg-acid-lime border-2 border-black px-6 py-3 font-display font-bold uppercase shadow-[4px_4px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000] transition-all cursor-pointer"
              >
                Create Contract
              </Link>
            </div>
          </div>
        ) : (
          filteredTransactions.map((transaction) => (
            <TransactionCard
              key={transaction.id}
              event={transaction}
              isSelected={selectedTransaction?.id === transaction.id}
              onClick={() => setSelectedTransaction(transaction)}
            />
          ))
        )}
      </div>
    </div>
  );

  const executionZone = <TransactionDetail event={selectedTransaction} />;

  return <AppLayout activeNavItem="transactions" commandZone={commandZone} executionZone={executionZone} />;
}
