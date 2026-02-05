'use client';

import { useState } from 'react';
import { Copy, ExternalLink, Check, Calendar, Coins, Users, CreditCard, ArrowRight } from 'lucide-react';
import EventTypeBadge from './EventTypeBadge';
import { Transaction } from './types';

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
    try {
      if (!dateString) return 'Unknown Date';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';

      return date.toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        timeZoneName: 'short',
      });
    } catch (e) {
      return 'Date Error';
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getBasescanUrl = () => {
    // Base Sepolia explorer (chain ID 84532)
    // Note: The actual network is Base Sepolia based on the backend configuration
    return `https://base-sepolia.blockscout.com/tx/${event.transaction_hash}`;
  };

  // Helper to format values
  const formatValue = (key: string, value: any): string => {
    if (key.toLowerCase().includes('amount') || key.toLowerCase().includes('price')) {
      // Assuming 6 decimals for USDC used in this project
      try {
        const num = Number(value) / 1000000;
        return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDC`;
      } catch { return value; }
    }
    if (key.toLowerCase().includes('date')) {
      try {
        return new Date(Number(value) * 1000).toLocaleDateString();
      } catch { return value; }
    }
    return String(value);
  };

  // Get friendly contract type name
  const getContractTypeName = (templateId?: string): string => {
    if (!templateId) return 'Contract';

    const typeMap: Record<string, string> = {
      'rent-vault': 'Rent Vault',
      'group-buy-escrow': 'Group Buy Escrow',
      'stable-allowance-treasury': 'Stable Allowance Treasury',
    };

    return typeMap[templateId] || templateId.split('-').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const eventData = event.event_data || {};
  const configData = eventData.config || {};
  const eventArgs = eventData.args || {}; // Event arguments from blockchain
  const note = eventData.note;

  // Icons mapping for fields
  const getIconForField = (field: string) => {
    if (field.includes('date')) return <Calendar className="w-4 h-4" />;
    if (field.includes('amount')) return <Coins className="w-4 h-4" />;
    if (field.includes('recruit') || field.includes('tenant') || field.includes('recipient')) return <Users className="w-4 h-4" />;
    return <ArrowRight className="w-4 h-4" />;
  };

  return (
    <div className="h-full overflow-auto p-6 md:p-12">
      <div className="bg-stark-white border-4 border-black shadow-[8px_8px_0px_#000] max-w-2xl mx-auto">
        {/* Header Section - Redesigned with better contrast */}
        <div className="border-b-4 border-black">
          {/* Top bar with event type badge */}
          <div className="bg-acid-lime px-6 py-3 border-b-2 border-black flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5" />
              <span className="font-mono text-sm font-bold uppercase">
                {formatDate(event.created_at)}
              </span>
            </div>
            <EventTypeBadge eventType={event.event_type} />
          </div>

          {/* Event Type Title */}
          <div className="bg-white px-6 py-6">
            <h2 className="font-headline text-4xl uppercase tracking-tight">
              {getContractTypeName(event.template_id)} — {event.event_type.replace('_', ' ')}
            </h2>
          </div>
        </div>


        <div className="p-8 space-y-8">

          {/* Action Summary */}
          <div className="p-6 bg-paper-cream border-2 border-dashed border-black">
            <div className="flex items-center gap-3 mb-3">
              <span className="bg-hot-pink text-white text-xs font-bold uppercase px-2 py-1 border border-black">
                ACTION
              </span>
            </div>
            <p className="font-display text-lg leading-relaxed">
              <span className="font-bold underline decoration-2 decoration-acid-lime">
                {event.from_address ? `${event.from_address.slice(0, 6)}...${event.from_address.slice(-4)}` : 'Unknown User'}
              </span>
              {' '}
              {event.event_type === 'deployment' ? 'deployed a new contract' :
                event.event_type === 'deposit' ? 'deposited funds into the vault' :
                  event.event_type === 'withdrawal' ? 'withdrew funds from the vault' :
                    `performed a ${event.event_type.replace('_', ' ').toLowerCase()}`}
              {note && <span className="block mt-2 text-sm text-gray-600 italic">"{note}"</span>}
            </p>
          </div>

          {/* Event Arguments (from blockchain) */}
          {Object.keys(eventArgs).length > 0 && (
            <div>
              <h3 className="font-headline text-xl uppercase mb-4 flex items-center gap-2">
                <Coins className="w-6 h-6" /> Event Data
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(eventArgs).map(([key, value]) => (
                  <div key={key} className="bg-white border-2 border-black p-4 hover:translate-x-[2px] hover:translate-y-[2px] transition-transform">
                    <p className="font-mono text-xs text-gray-500 uppercase mb-1 flex items-center gap-2">
                      {getIconForField(key)} {key}
                    </p>
                    <p className="font-display font-bold text-lg break-all">
                      {Array.isArray(value) ? value.join(', ') : formatValue(key, value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Event Data / Configuration Card */}
          {Object.keys(configData).length > 0 && (
            <div>
              <h3 className="font-headline text-xl uppercase mb-4 flex items-center gap-2">
                <CreditCard className="w-6 h-6" /> Configuration
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(configData).map(([key, value]) => (
                  <div key={key} className="bg-white border-2 border-black p-4 hover:translate-x-[2px] hover:translate-y-[2px] transition-transform">
                    <p className="font-mono text-xs text-gray-500 uppercase mb-1 flex items-center gap-2">
                      {getIconForField(key)} {key}
                    </p>
                    <p className="font-display font-bold text-lg break-all">
                      {Array.isArray(value) ? value.join(', ') : formatValue(key, value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata Grid */}
          <div className="border-t-4 border-black pt-8">
            <h3 className="font-headline text-xl uppercase mb-4">Metadata</h3>
            <div className="space-y-4">
              {/* Transaction Hash */}
              <div>
                <label className="font-mono text-xs font-bold uppercase text-gray-500 block mb-1">Transaction Hash</label>
                <div className="flex items-center gap-2">
                  <code className="bg-gray-100 px-3 py-2 border-2 border-black font-mono text-sm flex-1 break-all">
                    {event.transaction_hash}
                  </code>
                  <button onClick={() => copyToClipboard(event.transaction_hash, 'tx')} className="p-2 bg-acid-lime border-2 border-black hover:bg-hot-pink transition-colors">
                    {copiedField === 'tx' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-mono text-xs font-bold uppercase text-gray-500 block mb-1">Block</label>
                  <div className="font-mono font-bold text-lg">#{event.block_number}</div>
                </div>

                {event.from_address && (
                  <div>
                    <label className="font-mono text-xs font-bold uppercase text-gray-500 block mb-1">Initiator</label>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-lg border-b-2 border-black">
                        {event.from_address.slice(0, 6)}...{event.from_address.slice(-4)}
                      </span>
                      <button onClick={() => copyToClipboard(event.from_address!, 'from')} className="text-gray-500 hover:text-black">
                        {copiedField === 'from' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* View on Explorer Button */}
          <a
            href={getBasescanUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-black text-white text-center font-headline uppercase text-xl py-4 border-4 border-transparent hover:bg-white hover:text-black hover:border-black transition-colors"
          >
            View on Block Explorer <ExternalLink className="inline-block ml-2 w-5 h-5 mb-1" />
          </a>

        </div>
      </div>
    </div>
  );
}
