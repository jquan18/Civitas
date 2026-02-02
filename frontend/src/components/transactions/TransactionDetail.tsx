'use client';

import { useState } from 'react';
import { Copy, ExternalLink, Check } from 'lucide-react';
import EventTypeBadge from './EventTypeBadge';

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

interface TransactionDetailProps {
  event: Transaction | null;
}

export default function TransactionDetail({ event }: TransactionDetailProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!event) {
    return (
      <div className="flex items-center justify-center h-full p-12">
        <div className="bg-stark-white border-4 border-black shadow-[8px_8px_0px_#000] p-12 text-center">
          <p className="font-headline text-2xl uppercase mb-4">SELECT A TRANSACTION</p>
          <p className="font-display text-gray-600">
            Choose a transaction from the list to view details
          </p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    });
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getBasescanUrl = () => {
    const network = typeof window !== 'undefined'
      ? localStorage.getItem('civitas_network_mode') || 'mainnet'
      : 'mainnet';
    const baseUrl = network === 'mainnet'
      ? 'https://basescan.org'
      : 'https://sepolia.basescan.org';
    return `${baseUrl}/tx/${event.transaction_hash}`;
  };

  return (
    <div className="h-full overflow-auto p-6 md:p-12">
      {/* Receipt-style card with torn paper effect */}
      <div className="bg-stark-white border-4 border-black shadow-[8px_8px_0px_#000] max-w-2xl mx-auto">
        {/* Jagged top edge effect */}
        <div className="h-4 bg-void-black relative">
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-stark-white"
            style={{
              clipPath: 'polygon(0 0, 5% 100%, 10% 0, 15% 100%, 20% 0, 25% 100%, 30% 0, 35% 100%, 40% 0, 45% 100%, 50% 0, 55% 100%, 60% 0, 65% 100%, 70% 0, 75% 100%, 80% 0, 85% 100%, 90% 0, 95% 100%, 100% 0)'
            }}
          />
        </div>

        <div className="p-8">
          {/* Event Type - Large Badge */}
          <div className="mb-6 flex justify-center">
            <div className="transform scale-150">
              <EventTypeBadge eventType={event.event_type} />
            </div>
          </div>

          {/* Contract Basename */}
          {event.basename && (
            <div className="mb-6 text-center">
              <h2 className="font-headline text-3xl uppercase break-all">
                {event.basename}
              </h2>
            </div>
          )}

          {/* Details Grid */}
          <div className="space-y-4 border-t-2 border-dashed border-black pt-6">
            {/* Transaction Hash */}
            <div>
              <label className="font-display font-bold text-xs uppercase text-gray-600 block mb-1">
                Transaction Hash
              </label>
              <div className="flex items-center gap-2">
                <code className="font-mono text-sm bg-paper-cream px-3 py-2 border-2 border-black flex-1 break-all">
                  {event.transaction_hash}
                </code>
                <button
                  onClick={() => copyToClipboard(event.transaction_hash, 'hash')}
                  className="p-2 bg-acid-lime border-2 border-black hover:bg-hot-pink transition-colors cursor-pointer"
                  aria-label="Copy transaction hash"
                >
                  {copiedField === 'hash' ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Block Number */}
            <div>
              <label className="font-display font-bold text-xs uppercase text-gray-600 block mb-1">
                Block Number
              </label>
              <div className="font-mono text-lg bg-paper-cream px-3 py-2 border-2 border-black">
                {event.block_number.toLocaleString()}
              </div>
            </div>

            {/* Timestamp */}
            <div>
              <label className="font-display font-bold text-xs uppercase text-gray-600 block mb-1">
                Timestamp
              </label>
              <div className="font-display text-sm bg-paper-cream px-3 py-2 border-2 border-black">
                {formatDate(event.created_at)}
              </div>
            </div>

            {/* Contract Address */}
            <div>
              <label className="font-display font-bold text-xs uppercase text-gray-600 block mb-1">
                Contract Address
              </label>
              <div className="flex items-center gap-2">
                <code className="font-mono text-sm bg-paper-cream px-3 py-2 border-2 border-black flex-1 break-all">
                  {event.contract_address}
                </code>
                <button
                  onClick={() => copyToClipboard(event.contract_address, 'address')}
                  className="p-2 bg-acid-lime border-2 border-black hover:bg-hot-pink transition-colors cursor-pointer"
                  aria-label="Copy contract address"
                >
                  {copiedField === 'address' ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Event Data (if available) */}
            {event.event_data && Object.keys(event.event_data).length > 0 && (
              <div>
                <label className="font-display font-bold text-xs uppercase text-gray-600 block mb-1">
                  Event Data
                </label>
                <pre className="font-mono text-xs bg-paper-cream px-3 py-2 border-2 border-black overflow-x-auto">
                  {JSON.stringify(event.event_data, null, 2)}
                </pre>
              </div>
            )}

            {/* Role Badge */}
            {event.role && (
              <div>
                <label className="font-display font-bold text-xs uppercase text-gray-600 block mb-1">
                  Your Role
                </label>
                <div className="inline-block bg-hot-pink text-white px-3 py-1 text-xs font-headline uppercase border-2 border-black">
                  {event.role}
                </div>
              </div>
            )}
          </div>

          {/* Basescan Link */}
          <div className="mt-6 pt-6 border-t-2 border-dashed border-black">
            <a
              href={getBasescanUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-void-black text-stark-white border-2 border-black px-6 py-3 font-display font-bold uppercase shadow-[4px_4px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>View on Basescan</span>
              <ExternalLink className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* Jagged bottom edge effect */}
        <div className="h-4 bg-void-black relative">
          <div className="absolute top-0 left-0 right-0 h-2 bg-stark-white"
            style={{
              clipPath: 'polygon(0 100%, 5% 0, 10% 100%, 15% 0, 20% 100%, 25% 0, 30% 100%, 35% 0, 40% 100%, 45% 0, 50% 100%, 55% 0, 60% 100%, 65% 0, 70% 100%, 75% 0, 80% 100%, 85% 0, 90% 100%, 95% 0, 100% 100%)'
            }}
          />
        </div>
      </div>
    </div>
  );
}
