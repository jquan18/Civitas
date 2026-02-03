import { createPublicClient, http } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { FACTORY_ADDRESS } from './constants';

export interface PendingDeployment {
  landlord: string;
  tenant: string;
  monthlyAmount: string; // Stored as string in localStorage to preserve BigInt
  totalMonths: number;
  basename: string;
  timestamp: number;
  txHash?: string;
}

const PENDING_DEPLOYMENT_KEY = 'civitas_pending_deployment';

/**
 * Store deployment intent in localStorage before transaction
 */
export function persistPendingDeployment(deployment: PendingDeployment): void {
  try {
    localStorage.setItem(PENDING_DEPLOYMENT_KEY, JSON.stringify(deployment));
  } catch (error) {
    console.error('Failed to persist pending deployment:', error);
  }
}

/**
 * Retrieve pending deployment from localStorage
 */
export function getPendingDeployment(): PendingDeployment | null {
  try {
    const stored = localStorage.getItem(PENDING_DEPLOYMENT_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to retrieve pending deployment:', error);
    return null;
  }
}

/**
 * Clear pending deployment from localStorage
 */
export function clearPendingDeployment(): void {
  try {
    localStorage.removeItem(PENDING_DEPLOYMENT_KEY);
  } catch (error) {
    console.error('Failed to clear pending deployment:', error);
  }
}

/**
 * Check if contract exists on blockchain by looking for RentalDeployed event
 */
export async function checkContractDeployedOnChain(
  deployer: string,
  basename: string,
  chainId: number = base.id
): Promise<{ deployed: boolean; address?: string; txHash?: string }> {
  try {
    const chain = chainId === baseSepolia.id ? baseSepolia : base;

    const publicClient = createPublicClient({
      chain,
      transport: http(),
    });

    // Look for RentalDeployed events from this deployer with this basename
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
        creator: deployer as `0x${string}`,
      },
      fromBlock: 'earliest',
      toBlock: 'latest',
    });

    // Find matching deployment by basename
    for (const log of logs) {
      if (log.args.suggestedName === basename) {
        return {
          deployed: true,
          address: log.args.rental as string,
          txHash: log.transactionHash,
        };
      }
    }

    return { deployed: false };
  } catch (error) {
    console.error('Error checking contract on chain:', error);
    return { deployed: false };
  }
}

/**
 * Check if contract exists in database
 */
export async function checkContractInDatabase(
  contractAddress: string
): Promise<boolean> {
  try {
    // Use API endpoint instead of direct Supabase call (client-side safe)
    const response = await fetch(`/api/contracts/${contractAddress}`);
    return response.ok;
  } catch (error) {
    console.error('Error checking contract in database:', error);
    return false;
  }
}

/**
 * Store contract in database via API endpoint
 */
export async function storeContractInDatabase(
  contractAddress: string,
  deployment: PendingDeployment
): Promise<boolean> {
  try {
    const response = await fetch('/api/contracts/store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contract_address: contractAddress,
        landlord_address: deployment.landlord,
        tenant_address: deployment.tenant,
        basename: deployment.basename,
        monthly_amount: Number(deployment.monthlyAmount),
        total_months: deployment.totalMonths,
        state: 0, // Deployed state
      }),
    });

    if (response.ok) {
      console.log('✅ Contract stored in database:', contractAddress);
      return true;
    } else {
      const error = await response.json();
      console.error('Failed to store contract:', error);
      return false;
    }
  } catch (error) {
    console.error('Error storing contract in database:', error);
    return false;
  }
}

/**
 * Attempt to recover a pending deployment
 * Returns true if recovery was successful or not needed
 */
export async function attemptRecovery(
  deployment: PendingDeployment,
  chainId: number = base.id
): Promise<{ recovered: boolean; contractAddress?: string; reason?: string }> {
  try {
    // Check if contract was deployed on-chain
    const onChainResult = await checkContractDeployedOnChain(
      deployment.landlord,
      deployment.basename,
      chainId
    );

    if (!onChainResult.deployed) {
      // Contract was never deployed - transaction might have failed
      // Clear pending deployment after 1 hour
      const ONE_HOUR = 60 * 60 * 1000;
      if (Date.now() - deployment.timestamp > ONE_HOUR) {
        clearPendingDeployment();
        return {
          recovered: false,
          reason: 'Deployment transaction failed or never confirmed'
        };
      }
      return {
        recovered: false,
        reason: 'Waiting for deployment transaction to confirm'
      };
    }

    const contractAddress = onChainResult.address!;

    // Check if already in database
    const inDatabase = await checkContractInDatabase(contractAddress);

    if (inDatabase) {
      // Already stored - just clear localStorage
      clearPendingDeployment();
      return {
        recovered: true,
        contractAddress,
        reason: 'Contract already in database'
      };
    }

    // Not in database - store it now (recovery!)
    const stored = await storeContractInDatabase(contractAddress, deployment);

    if (stored) {
      clearPendingDeployment();
      return {
        recovered: true,
        contractAddress,
        reason: 'Successfully recovered and stored contract'
      };
    }

    return {
      recovered: false,
      contractAddress,
      reason: 'Failed to store contract in database'
    };

  } catch (error) {
    console.error('Recovery attempt failed:', error);
    return {
      recovered: false,
      reason: `Recovery error: ${error}`
    };
  }
}
