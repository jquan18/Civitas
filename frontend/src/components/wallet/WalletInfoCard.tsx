'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import HardShadowCard from '@/components/ui/HardShadowCard';

interface WalletInfoCardProps {
  address: `0x${string}`;
  ensName?: string | null;
  isConnected: boolean;
}

export default function WalletInfoCard({ address, ensName, isConnected }: WalletInfoCardProps) {
  const [copied, setCopied] = useState(false);

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <HardShadowCard className="p-6">
      <div className="flex flex-col gap-4">
        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-display font-bold uppercase text-gray-600">
            Wallet Status
          </span>
          {isConnected && (
            <span className="bg-acid-lime text-black px-3 py-1 text-xs font-headline uppercase border-2 border-black">
              CONNECTED
            </span>
          )}
        </div>

        {/* ENS Name or Address */}
        {ensName ? (
          <>
            <h2 className="font-headline text-2xl md:text-3xl lg:text-4xl uppercase break-all">
              {ensName}
            </h2>
            <div className="font-mono text-sm text-gray-600 break-all">
              {address}
            </div>
          </>
        ) : (
          <h2 className="font-mono text-xl md:text-2xl break-all">
            {address}
          </h2>
        )}

        {/* Copy Button */}
        <button
          onClick={copyAddress}
          className="w-full bg-void-black text-stark-white border-2 border-black px-4 py-3 font-display font-bold uppercase shadow-[4px_4px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-5 h-5" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-5 h-5" />
              <span>Copy Address</span>
            </>
          )}
        </button>
      </div>
    </HardShadowCard>
  );
}
