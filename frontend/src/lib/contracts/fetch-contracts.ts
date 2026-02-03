import { createPublicClient, http } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { RECURRING_RENT_ABI, RENTAL_FACTORY_ABI } from './abis';
import { FACTORY_ADDRESS } from './constants';

// Contract state enum matching Solidity
export enum ContractState {
  Deployed = 0,
  Active = 1,
  Completed = 2,
  TerminationPending = 3,
  Terminated = 4,
}

export interface RentalContract {
  address: `0x${string}`;
  landlord: `0x${string}`;
  tenant: `0x${string}`;
  monthlyAmount: bigint;
  totalMonths: number;
  startTime: bigint;
  totalPaid: bigint;
  state: ContractState;
  terminationNoticeTime: bigint;
}

/**
 * Fetch contracts deployed by a user
 */
export async function fetchUserContracts(
  userAddress: `0x${string}`,
  chainId: number = baseSepolia.id // ✅ Default to testnet
): Promise<RentalContract[]> {
  const chain = chainId === baseSepolia.id ? baseSepolia : base;

  const publicClient = createPublicClient({
    chain,
    transport: http(),
  });

  // Get RentalDeployed events for this user
  const logs = await publicClient.getLogs({
    address: FACTORY_ADDRESS,
    event: {
      type: 'event',
      name: 'RentalDeployed',
      inputs: [
        { name: 'creator', type: 'address', indexed: true },
        { name: 'rental', type: 'address', indexed: true },
        { name: 'landlord', type: 'address', indexed: true },
        { name: 'tenant', type: 'address', indexed: false },
        { name: 'suggestedName', type: 'string', indexed: false },
      ],
    },
    args: {
      creator: userAddress,
    },
    fromBlock: 'earliest',
    toBlock: 'latest',
  });

  // Fetch contract details for each deployed contract
  const contracts: RentalContract[] = [];

  for (const log of logs) {
    const rentalAddress = log.args.rental as `0x${string}`;

    const [landlord, tenant, monthlyAmount, totalMonths, startTime, totalPaid, state, terminationNoticeTime] =
      await Promise.all([
        publicClient.readContract({
          address: rentalAddress,
          abi: RECURRING_RENT_ABI,
          functionName: 'landlord',
        }),
        publicClient.readContract({
          address: rentalAddress,
          abi: RECURRING_RENT_ABI,
          functionName: 'tenant',
        }),
        publicClient.readContract({
          address: rentalAddress,
          abi: RECURRING_RENT_ABI,
          functionName: 'monthlyAmount',
        }),
        publicClient.readContract({
          address: rentalAddress,
          abi: RECURRING_RENT_ABI,
          functionName: 'totalMonths',
        }),
        publicClient.readContract({
          address: rentalAddress,
          abi: RECURRING_RENT_ABI,
          functionName: 'startTime',
        }),
        publicClient.readContract({
          address: rentalAddress,
          abi: RECURRING_RENT_ABI,
          functionName: 'totalPaid',
        }),
        publicClient.readContract({
          address: rentalAddress,
          abi: RECURRING_RENT_ABI,
          functionName: 'state',
        }),
        publicClient.readContract({
          address: rentalAddress,
          abi: RECURRING_RENT_ABI,
          functionName: 'terminationNoticeTime',
        }),
      ]);

    contracts.push({
      address: rentalAddress,
      landlord: landlord as `0x${string}`,
      tenant: tenant as `0x${string}`,
      monthlyAmount: monthlyAmount as bigint,
      totalMonths: Number(totalMonths),
      startTime: startTime as bigint,
      totalPaid: totalPaid as bigint,
      state: state as ContractState,
      terminationNoticeTime: terminationNoticeTime as bigint,
    });
  }

  return contracts;
}

/**
 * Fetch single contract details
 */
export async function fetchContract(
  contractAddress: `0x${string}`,
  chainId: number = baseSepolia.id // ✅ Default to testnet
): Promise<RentalContract> {
  const chain = chainId === baseSepolia.id ? baseSepolia : base;

  const publicClient = createPublicClient({
    chain,
    transport: http(),
  });

  const [landlord, tenant, monthlyAmount, totalMonths, startTime, totalPaid, state, terminationNoticeTime] =
    await Promise.all([
      publicClient.readContract({
        address: contractAddress,
        abi: RECURRING_RENT_ABI,
        functionName: 'landlord',
      }),
      publicClient.readContract({
        address: contractAddress,
        abi: RECURRING_RENT_ABI,
        functionName: 'tenant',
      }),
      publicClient.readContract({
        address: contractAddress,
        abi: RECURRING_RENT_ABI,
        functionName: 'monthlyAmount',
      }),
      publicClient.readContract({
        address: contractAddress,
        abi: RECURRING_RENT_ABI,
        functionName: 'totalMonths',
      }),
      publicClient.readContract({
        address: contractAddress,
        abi: RECURRING_RENT_ABI,
        functionName: 'startTime',
      }),
      publicClient.readContract({
        address: contractAddress,
        abi: RECURRING_RENT_ABI,
        functionName: 'totalPaid',
      }),
      publicClient.readContract({
        address: contractAddress,
        abi: RECURRING_RENT_ABI,
        functionName: 'state',
      }),
      publicClient.readContract({
        address: contractAddress,
        abi: RECURRING_RENT_ABI,
        functionName: 'terminationNoticeTime',
      }),
    ]);

  return {
    address: contractAddress,
    landlord: landlord as `0x${string}`,
    tenant: tenant as `0x${string}`,
    monthlyAmount: monthlyAmount as bigint,
    totalMonths: Number(totalMonths),
    startTime: startTime as bigint,
    totalPaid: totalPaid as bigint,
    state: state as ContractState,
    terminationNoticeTime: terminationNoticeTime as bigint,
  };
}
