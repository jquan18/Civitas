'use client';

import HardShadowCard from '@/components/ui/HardShadowCard';
import EventTypeBadge from './EventTypeBadge';

interface Transaction {
  id: string;
  event_type: 'created' | 'activated' | 'rent_released' | 'termination_initiated' | 'terminated' | 'completed';
  contract_address: string;
  basename: string | null;
  transaction_hash: string;
  block_number: number;
  created_at: string;
  role?: string;
}

interface TransactionCardProps {
  event: Transaction;
  isSelected: boolean;
  onClick: () => void;
}

export default function TransactionCard({ event, isSelected, onClick }: TransactionCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateHash = (hash: string) => {
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  return (
    <HardShadowCard
      onClick={onClick}
      hoverable
      className={`p-4 cursor-pointer transition-all duration-200 ${
        isSelected ? 'ring-2 ring-acid-lime' : ''
      }`}
    >
      <div className="flex flex-col gap-2">
        {/* Event Type Badge */}
        <div className="flex items-center justify-between">
          <EventTypeBadge eventType={event.event_type} />
          <span className="text-xs font-display text-gray-500">
            {formatDate(event.created_at)}
          </span>
        </div>

        {/* Basename or Address */}
        <div className="font-display font-bold text-sm">
          {event.basename || `Contract ${truncateHash(event.contract_address)}`}
        </div>

        {/* Transaction Hash */}
        <div className="font-mono text-xs text-gray-600">
          Tx: {truncateHash(event.transaction_hash)}
        </div>

        {/* Block Number */}
        <div className="text-xs font-display text-gray-500">
          Block #{event.block_number.toLocaleString()}
        </div>
      </div>
    </HardShadowCard>
  );
}
