'use client';

import { RefreshCw, Check, AlertCircle } from 'lucide-react';
import TactileButton from '@/components/ui/TactileButton';
import { useSyncENS } from '@/hooks/useSyncENS';
import type { ContractTemplate } from '@/lib/contracts/constants';

interface SyncENSButtonProps {
  contractAddress: `0x${string}`;
  basename: string | null | undefined;
  templateId: ContractTemplate;
  chainId: number;
}

export default function SyncENSButton({
  contractAddress,
  basename,
  templateId,
  chainId,
}: SyncENSButtonProps) {
  const { sync, isSyncing, isSuccess, error, canSync, resetWrite } = useSyncENS(
    contractAddress,
    basename,
    templateId,
    chainId
  );

  if (!basename) return null;

  return (
    <div className="w-full">
      <TactileButton
        variant="primary"
        className="w-full group"
        onClick={() => {
          if (isSuccess || error) resetWrite();
          sync();
        }}
        disabled={isSyncing || !canSync}
      >
        <div className="p-2 flex items-center justify-center gap-3">
          {isSyncing ? (
            <RefreshCw className="w-5 h-5 text-void-black animate-spin" />
          ) : isSuccess ? (
            <Check className="w-5 h-5 text-void-black" />
          ) : (
            <RefreshCw className="w-5 h-5 text-void-black group-hover:rotate-180 transition-transform" />
          )}
          <span className="font-headline text-lg text-void-black uppercase tracking-widest">
            {isSyncing
              ? 'Syncing ENS Records...'
              : isSuccess
                ? 'ENS Records Synced!'
                : 'Sync ENS Records'}
          </span>
        </div>
      </TactileButton>

      {error && (
        <div className="mt-2 bg-red-50 border-2 border-red-500 p-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="font-display text-xs text-red-700 truncate">
            {(error as Error).message?.slice(0, 100) || 'Transaction failed'}
          </p>
        </div>
      )}

      {isSuccess && (
        <div className="mt-2 bg-green-50 border-2 border-green-500 p-2">
          <p className="font-display text-xs text-green-700 text-center">
            Live contract state pushed to ENS text records
          </p>
        </div>
      )}
    </div>
  );
}
