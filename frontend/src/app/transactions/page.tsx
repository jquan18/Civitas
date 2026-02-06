'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import AppLayout from '@/components/layout/AppLayout';
import TransactionCard from '@/components/transactions/TransactionCard';
import TransactionDetail from '@/components/transactions/TransactionDetail';
import { ChevronDown } from 'lucide-react';
import Link from 'next/link';

import { Transaction } from '@/components/transactions/types';
import TransactionList from '@/components/transactions/TransactionList';
import { useTransactionSubscription } from '@/lib/supabase/hooks/useTransactionSubscription';

const EVENT_TYPE_FILTERS = [
  { value: 'all', label: 'All Events' },
  { value: 'deployment', label: 'Deployments' },
  { value: 'deposit', label: 'Deposits' },
  { value: 'withdrawal', label: 'Withdrawals' },
  { value: 'refund', label: 'Refunds' },
  { value: 'claim', label: 'Claims' },
  { value: 'approval', label: 'Approvals' },
  { value: 'goal_reached', label: 'Goals Reached' },
  { value: 'funds_released', label: 'Funds Released' },
  { value: 'delivery_confirmed', label: 'Deliveries Confirmed' },
  { value: 'vote', label: 'Votes' },
  { value: 'state_change', label: 'State Changes' },
] as const;

export default function TransactionsPage() {
  const { address, isConnected } = useAccount();
  const { transactions, loading } = useTransactionSubscription(address);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [filter, setFilter] = useState('all');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auto-select first transaction when transactions load
  useEffect(() => {
    if (transactions.length > 0 && !selectedTransaction) {
      setSelectedTransaction(transactions[0]);
    }
  }, [transactions, selectedTransaction]);

  console.log('[TransactionsPage] Rendering with state:', {
    isConnected,
    loading,
    itemCount: transactions.length,
    filter,
    address
  });

  // Client-side filtering
  const filteredTransactions = filter === 'all'
    ? transactions
    : transactions.filter(tx => tx.event_type === filter);

  const commandZone = (
    <div className="flex flex-col h-full">
      {/* Header with Filter */}
      <div className="p-4 border-b-4 border-black bg-stark-white shrink-0">
        <h2 className="font-headline text-2xl uppercase tracking-tighter mb-4">
          Transaction History
        </h2>
        {/* ... (Filter Dropdown and Live Feed Badge remain same) */}
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
          <span className="text-xs font-display font-bold bg-black text-white !text-white px-2 py-1 border border-white" style={{ backgroundColor: 'black', color: 'white' }}>
            LIVE FEED
          </span>
          <span className="w-3 h-3 bg-red-500 border-2 border-black"></span>
        </div>
      </div>

      {/* Transaction List */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <TransactionList
          transactions={filteredTransactions}
          loading={loading}
          isConnected={isConnected}
          selectedTransactionId={selectedTransaction?.id}
          onSelectTransaction={setSelectedTransaction}
        />
      </div>
    </div>
  );
  // ...

  const executionZone = <TransactionDetail event={selectedTransaction} />;

  if (!isMounted) return null;

  return <AppLayout activeNavItem="transactions" commandZone={commandZone} executionZone={executionZone} />;
}
