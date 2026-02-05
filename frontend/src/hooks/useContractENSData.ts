import { useReadContract, useChainId } from 'wagmi';
import { CIVITAS_FACTORY_ABI, ENS_L2_RESOLVER_ABI } from '@/lib/contracts/abis';
import { CIVITAS_FACTORY_ADDRESS, ENS_L2_RESOLVER, getCivitasEnsDomain } from '@/lib/contracts/constants';

const ENS_RECORD_KEYS = [
  'contract.type',
  'contract.status',
  'contract.creator',
  'contract.rent.amount',
  'contract.rent.dueDate',
  'contract.escrow.goal',
  'contract.escrow.expiry',
  'contract.allowance.amount',
] as const;

export function useContractENSData(basename: string | undefined | null) {
  const chainId = useChainId();
  const factoryAddress = CIVITAS_FACTORY_ADDRESS[chainId];
  const resolverAddress = ENS_L2_RESOLVER[chainId];

  // Calculate ENS node from basename
  const { data: node, isLoading: isNodeLoading } = useReadContract({
    address: factoryAddress,
    abi: CIVITAS_FACTORY_ABI,
    functionName: 'calculateENSNode',
    args: basename ? [basename] : undefined,
    query: { enabled: !!basename && !!factoryAddress },
  });

  // Read text records from L2 Resolver
  const { data: contractType } = useReadContract({
    address: resolverAddress,
    abi: ENS_L2_RESOLVER_ABI,
    functionName: 'text',
    args: node ? [node, 'contract.type'] : undefined,
    query: { enabled: !!node && !!resolverAddress },
  });

  const { data: contractStatus } = useReadContract({
    address: resolverAddress,
    abi: ENS_L2_RESOLVER_ABI,
    functionName: 'text',
    args: node ? [node, 'contract.status'] : undefined,
    query: { enabled: !!node && !!resolverAddress },
  });

  const { data: contractCreator } = useReadContract({
    address: resolverAddress,
    abi: ENS_L2_RESOLVER_ABI,
    functionName: 'text',
    args: node ? [node, 'contract.creator'] : undefined,
    query: { enabled: !!node && !!resolverAddress },
  });

  const { data: rentAmount } = useReadContract({
    address: resolverAddress,
    abi: ENS_L2_RESOLVER_ABI,
    functionName: 'text',
    args: node ? [node, 'contract.rent.amount'] : undefined,
    query: { enabled: !!node && !!resolverAddress },
  });

  const { data: rentDueDate } = useReadContract({
    address: resolverAddress,
    abi: ENS_L2_RESOLVER_ABI,
    functionName: 'text',
    args: node ? [node, 'contract.rent.dueDate'] : undefined,
    query: { enabled: !!node && !!resolverAddress },
  });

  const { data: escrowGoal } = useReadContract({
    address: resolverAddress,
    abi: ENS_L2_RESOLVER_ABI,
    functionName: 'text',
    args: node ? [node, 'contract.escrow.goal'] : undefined,
    query: { enabled: !!node && !!resolverAddress },
  });

  const { data: escrowExpiry } = useReadContract({
    address: resolverAddress,
    abi: ENS_L2_RESOLVER_ABI,
    functionName: 'text',
    args: node ? [node, 'contract.escrow.expiry'] : undefined,
    query: { enabled: !!node && !!resolverAddress },
  });

  const { data: allowanceAmount } = useReadContract({
    address: resolverAddress,
    abi: ENS_L2_RESOLVER_ABI,
    functionName: 'text',
    args: node ? [node, 'contract.allowance.amount'] : undefined,
    query: { enabled: !!node && !!resolverAddress },
  });

  // Resolve address from L2 Resolver
  const { data: resolvedAddress } = useReadContract({
    address: resolverAddress,
    abi: ENS_L2_RESOLVER_ABI,
    functionName: 'addr',
    args: node ? [node] : undefined,
    query: { enabled: !!node && !!resolverAddress },
  });

  const isLoading = isNodeLoading;
  const ensDomain = getCivitasEnsDomain(chainId);
  const ensName = basename ? `${basename}.${ensDomain}` : null;

  // Collect all records into a map
  const records: Record<string, string> = {};
  if (contractType) records['contract.type'] = contractType;
  if (contractStatus) records['contract.status'] = contractStatus;
  if (contractCreator) records['contract.creator'] = contractCreator;
  if (rentAmount) records['contract.rent.amount'] = rentAmount;
  if (rentDueDate) records['contract.rent.dueDate'] = rentDueDate;
  if (escrowGoal) records['contract.escrow.goal'] = escrowGoal;
  if (escrowExpiry) records['contract.escrow.expiry'] = escrowExpiry;
  if (allowanceAmount) records['contract.allowance.amount'] = allowanceAmount;

  return {
    node,
    ensName,
    resolvedAddress: resolvedAddress as `0x${string}` | undefined,
    type: contractType || null,
    status: contractStatus || null,
    creator: contractCreator || null,
    records,
    isLoading,
  };
}
