'use client';

import { useState } from 'react';
import { Home, Users, Wallet, ExternalLink, Copy, Check, Shield } from 'lucide-react';
import { templateRegistry } from '@/lib/templates/registry';
import { getCivitasEnsDomain } from '@/lib/contracts/constants';
import { formatUnits } from 'viem';
import Link from 'next/link';

interface GenericContractCardProps {
  contract: {
    contract_address: string;
    template_id: string;
    creator_address: string;
    state: number;
    basename?: string;
    config: any;
    on_chain_state?: any;
    created_at: string;
    chain_id?: number;
  };
}

const iconMap = {
  'Home': Home,
  'Users': Users,
  'Wallet': Wallet,
}

const stateLabels = [
  { label: 'Deployed', color: 'bg-gray-400', emoji: '🔴' },
  { label: 'Active', color: 'bg-[#00FF00]', emoji: '🟢' },
  { label: 'Completed', color: 'bg-[#0000FF]', emoji: '✅' },
  { label: 'Terminating', color: 'bg-[#FF00FF]', emoji: '🟣' },
  { label: 'Terminated', color: 'bg-black', emoji: '⚫' },
]

export function GenericContractCard({ contract }: GenericContractCardProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [copied, setCopied] = useState(false);

  const template = templateRegistry.get(contract.template_id);
  const ensDomain = getCivitasEnsDomain(contract.chain_id || 84532);
  
  if (!template) {
    return null; // Invalid template
  }

  const IconComponent = iconMap[template.icon as keyof typeof iconMap] || Wallet;
  const stateInfo = stateLabels[contract.state] || stateLabels[0];

  const formatValue = (field: any, value: any) => {
    if (!value && value !== 0) return '---';

    switch (field.type) {
      case 'address':
        if (typeof value === 'string' && value.startsWith('0x')) {
          return value.slice(0, 10) + '...' + value.slice(-8)
        }
        return value
      case 'amount':
        try {
          const numValue = typeof value === 'string' ? value : value.toString()
          const formatted = numValue.length > 8 
            ? formatUnits(BigInt(numValue), 6)
            : numValue
          return (
            parseFloat(formatted).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }) + ' USDC'
          )
        } catch {
          return value
        }
      case 'date':
        try {
          const timestamp = typeof value === 'string' ? parseInt(value) : value
          const date = timestamp > 10000000000 ? new Date(timestamp) : new Date(timestamp * 1000)
          return date.toLocaleDateString()
        } catch {
          return value
        }
      case 'number':
        return value.toString()
      default:
        if (field.format) {
          return field.format(value)
        }
        return String(value)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(contract.contract_address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Merge config and on_chain_state for display
  const displayData = {
    ...contract.config,
    ...contract.on_chain_state,
  };

  return (
    <Link href={`/contracts/${contract.contract_address}`}>
      <div
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => setIsPressed(false)}
        className={`
          relative bg-white border-[3px] border-black p-6
          transition-all duration-75 cursor-pointer
          ${
            isPressed
              ? 'translate-x-[4px] translate-y-[4px] shadow-none'
              : 'shadow-[4px_4px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000]'
          }
        `}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Icon */}
            <div 
              className="w-10 h-10 border-2 border-black flex items-center justify-center"
              style={{ backgroundColor: template.color }}
            >
              <IconComponent className="w-5 h-5" />
            </div>

            {/* Template Name */}
            <div>
              <h3 className="font-black text-lg uppercase tracking-tight">
                {template.name}
              </h3>
              <p className="font-mono text-xs opacity-60">
                {contract.template_id}
              </p>
            </div>
          </div>

          {/* State Badge */}
          <div 
            className={`${stateInfo.color} border-2 border-black px-3 py-1 text-white font-mono text-xs font-bold`}
          >
            {stateInfo.emoji} {stateInfo.label}
          </div>
        </div>

        {/* Contract Address */}
        <div className="mb-4">
          <div className="flex items-center gap-2 bg-[#FAF9F6] border border-black p-2">
            <span className="font-mono text-xs flex-1 truncate">
              {contract.contract_address}
            </span>
            <button
              onClick={(e) => {
                e.preventDefault();
                handleCopy();
              }}
              className="p-1 hover:bg-black hover:text-white transition-colors"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            </button>
            <a
              href={`https://basescan.org/address/${contract.contract_address}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1 hover:bg-black hover:text-white transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Basename / ENS Identity */}
        {contract.basename && (
          <div className="mb-4 bg-[#CCFF00] border-2 border-black px-3 py-2">
            <div className="flex items-center justify-between">
              <p className="font-mono text-sm font-bold">
                {contract.basename}.{ensDomain}
              </p>
              <div className="flex items-center gap-1">
                <Shield className="w-3 h-3" />
                <span className="font-mono text-xs font-bold">ENS Verified</span>
              </div>
            </div>
          </div>
        )}

        {/* Key Fields (first 3) */}
        <div className="space-y-2 mb-4">
          {template.dashboardFields.slice(0, 3).map((field) => {
            const value = displayData[field.key];
            
            return (
              <div key={field.key} className="flex justify-between items-center">
                <span className="font-mono text-xs uppercase font-bold opacity-60">
                  {field.label}
                </span>
                <span className="font-mono text-sm font-bold">
                  {formatValue(field, value)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Timestamp */}
        <div className="border-t border-dashed border-black pt-3 mt-3">
          <p className="font-mono text-xs opacity-40">
            Created {new Date(contract.created_at).toLocaleDateString()}
          </p>
        </div>

        {/* Hover Indicator */}
        <div className="absolute bottom-4 right-4 font-black text-sm opacity-0 group-hover:opacity-100 transition-opacity">
          &gt;&gt;&gt;
        </div>
      </div>
    </Link>
  );
}
