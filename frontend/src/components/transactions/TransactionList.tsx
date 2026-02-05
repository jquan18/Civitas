import Link from 'next/link';
import TransactionCard from './TransactionCard';
import { Transaction } from './types';

interface TransactionListProps {
  transactions: Transaction[];
  loading: boolean;
  isConnected: boolean;
  selectedTransactionId?: string;
  onSelectTransaction: (transaction: Transaction) => void;
  emptyMessage?: string;
  showCreateLink?: boolean;
}

export default function TransactionList({
  transactions,
  loading,
  isConnected,
  selectedTransactionId,
  onSelectTransaction,
  emptyMessage = "No Transactions Yet",
  showCreateLink = true,
}: TransactionListProps) {
  console.log('[TransactionList] Rendering. Loading:', loading, 'Count:', transactions.length, 'Connected:', isConnected);

  if (!isConnected) {
    return (
      <div className="text-center my-12">
        <div className="bg-stark-white border-4 border-black shadow-[8px_8px_0px_#000] p-12 inline-block">
          <p className="font-display font-bold text-black mb-4">WALLET NOT CONNECTED</p>
          <p className="font-display text-sm text-gray-600">
            Connect your wallet to view transactions
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-stark-white border-[3px] border-black shadow-[4px_4px_0px_#000] p-4 h-32 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center my-12">
        <div className="bg-stark-white border-4 border-black shadow-[8px_8px_0px_#000] p-12 inline-block">
          <p className="font-display font-bold text-black mb-4 uppercase">{emptyMessage}</p>
          <p className="font-display text-sm text-gray-600 mb-6">
            There are no transactions recorded for this criteria.
          </p>
          {showCreateLink && (
            <Link
              href="/create"
              className="inline-block bg-acid-lime border-2 border-black px-6 py-3 font-display font-bold uppercase shadow-[4px_4px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000] transition-all cursor-pointer"
            >
              Create Contract
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {transactions.map((transaction) => (
        <TransactionCard
          key={transaction.id}
          event={transaction}
          isSelected={selectedTransactionId === transaction.id}
          onClick={() => onSelectTransaction(transaction)}
        />
      ))}
    </div>
  );
}
