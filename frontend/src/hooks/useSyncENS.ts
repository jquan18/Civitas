'use client';

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import {
  CIVITAS_FACTORY_ABI,
  RENT_VAULT_ABI,
  GROUP_BUY_ESCROW_ABI,
  STABLE_ALLOWANCE_TREASURY_ABI,
} from '@/lib/contracts/abis';
import { CIVITAS_FACTORY_ADDRESS } from '@/lib/contracts/constants';
import type { ContractTemplate } from '@/lib/contracts/constants';

const TEMPLATE_ABIS: Record<ContractTemplate, readonly Record<string, unknown>[]> = {
  RentVault: RENT_VAULT_ABI,
  GroupBuyEscrow: GROUP_BUY_ESCROW_ABI,
  StableAllowanceTreasury: STABLE_ALLOWANCE_TREASURY_ABI,
};

export function useSyncENS(
  contractAddress: `0x${string}`,
  basename: string | null | undefined,
  templateId: ContractTemplate,
  chainId: number
) {
  const factoryAddress = CIVITAS_FACTORY_ADDRESS[chainId];
  const abi = TEMPLATE_ABIS[templateId];

  // Step 1: Read live metadata from contract
  const {
    data: metadata,
    isLoading: isReadingMetadata,
    refetch: refetchMetadata,
  } = useReadContract({
    address: contractAddress,
    abi: abi as typeof RENT_VAULT_ABI,
    functionName: 'getENSMetadata',
    chainId,
    query: { enabled: !!contractAddress && !!abi },
  });

  // Step 2: Write to ENS via factory
  const {
    writeContract,
    data: txHash,
    isPending: isWriting,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    error: confirmError,
  } = useWaitForTransactionReceipt({ hash: txHash });

  const sync = async () => {
    if (!metadata || !basename || !factoryAddress) return;

    const [, , keys, values] = metadata as [string, string, string[], string[]];

    writeContract({
      address: factoryAddress,
      abi: CIVITAS_FACTORY_ABI,
      functionName: 'setContractENSRecords',
      args: [contractAddress, basename, keys, values],
      chainId,
    });
  };

  const isSyncing = isReadingMetadata || isWriting || isConfirming;
  const error = writeError || confirmError;

  return {
    sync,
    refetchMetadata,
    metadata,
    isSyncing,
    isSuccess,
    error,
    txHash,
    resetWrite,
    canSync: !!metadata && !!basename && !!factoryAddress,
  };
}
