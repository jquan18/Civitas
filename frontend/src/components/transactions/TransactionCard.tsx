'use client';

import HardShadowCard from '@/components/ui/HardShadowCard';
import EventTypeBadge from './EventTypeBadge';

import { Transaction } from './types';

interface TransactionCardProps {
  event: Transaction;
  isSelected: boolean;
  onClick: () => void;
}

export default function TransactionCard({ event, isSelected, onClick }: TransactionCardProps) {
  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return 'Unknown Date';
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) return 'Invalid Date';

      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'Date Error';
    }
  };

  const truncateHash = (hash: string) => {
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  // Extract amount from event data if available
  const getEventAmount = () => {
    const args = event.event_data?.args;
    if (!args) return null;

    const amount = args.amount || args.incrementAmount;
    if (amount) {
      try {
        const num = Number(amount) / 1000000; // USDC has 6 decimals
        return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
      } catch {
        return null;
      }
    }
    return null;
  };

  // Get action description
  const getActionDescription = () => {
    const from = event.from_address ? truncateHash(event.from_address) : 'Unknown';
    const amount = getEventAmount();

    switch (event.event_type) {
      case 'deployment':
        return `${from} deployed contract`;
      case 'deposit':
        return `${from} deposited${amount ? ' ' + amount : ''}`;
      case 'withdrawal':
        return `${from} withdrew${amount ? ' ' + amount : ''}`;
      case 'claim':
        return `${from} claimed${amount ? ' ' + amount : ''}`;
      case 'approval':
        return `${from} approved allowance`;
      case 'refund':
        return `${from} received refund${amount ? ' ' + amount : ''}`;
      case 'goal_reached':
        return `Goal reached${amount ? ': ' + amount : ''}`;
      case 'funds_released':
        return `Funds released to ${from}`;
      case 'delivery_confirmed':
        return `${from} confirmed delivery`;
      case 'vote':
        return `${from} voted`;
      case 'state_change':
        return `State changed`;
      default:
        return `${from} ${event.event_type.replace('_', ' ')}`;
    }
  };

  return (
    <HardShadowCard
      onClick={onClick}
      hoverable
      className={`p-4 cursor-pointer transition-all duration-200 ${isSelected ? 'ring-2 ring-acid-lime' : ''
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

        {/* Action Description (NEW - shows who did what) */}
        <div className="font-display font-bold text-sm">
          {getActionDescription()}
        </div>

        {/* Basename or Address */}
        <div className="font-display text-xs text-gray-600">
          {event.basename || `Contract ${truncateHash(event.contract_address)}`}
        </div>

        {/* Transaction Hash */}
        <div className="font-mono text-xs text-gray-500">
          {truncateHash(event.transaction_hash)}
        </div>
      </div>
    </HardShadowCard>
  );
}
