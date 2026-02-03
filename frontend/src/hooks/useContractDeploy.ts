import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { FACTORY_ADDRESS } from '@/lib/contracts/constants';
import { RENTAL_FACTORY_ABI } from '@/lib/contracts/abis';
import { predictRentalAddress } from '@/lib/contracts/predict-address';
import type { RentalConfig } from '@/lib/ai/schemas';
import {
  persistPendingDeployment,
  clearPendingDeployment,
  storeContractInDatabase,
  type PendingDeployment,
} from '@/lib/contracts/recovery';

export function useContractDeploy() {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const [suggestedName, setSuggestedName] = useState<string>('');
  const [predictedAddress, setPredictedAddress] = useState<`0x${string}` | null>(null);
  const [lastDeployedConfig, setLastDeployedConfig] = useState<{
    landlord: string;
    tenant: string;
    monthlyAmount: bigint;
    totalMonths: number;
    basename: string;
  } | null>(null);

  /**
   * Generate semantic basename using AI
   */
  const generateName = async (config: RentalConfig, conversationContext?: string) => {
    try {
      const response = await fetch('/api/generate-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, conversationContext }),
      });

      if (response.ok) {
        const { suggestedName: name } = await response.json();
        setSuggestedName(name);

        if (address) {
          const predicted = predictRentalAddress(address, name);
          setPredictedAddress(predicted);
        }

        return name;
      }
    } catch (error) {
      console.error('Failed to generate name:', error);
    }
    return null;
  };

  /**
   * Deploy rental contract to predicted address
   */
  const deployContract = async (
    landlord: `0x${string}`,
    tenant: `0x${string}`,
    monthlyAmount: bigint,
    totalMonths: number,
    name?: string
  ) => {
    const nameToUse = name || suggestedName;

    if (!nameToUse) {
      throw new Error('No basename provided');
    }

    // Store config for post-deployment database write
    const deployConfig = {
      landlord,
      tenant,
      monthlyAmount,
      totalMonths,
      basename: nameToUse,
    };

    setLastDeployedConfig(deployConfig);

    // 🔥 NEW: Persist to localStorage BEFORE deploying (for recovery)
    const pendingDeployment: PendingDeployment = {
      landlord,
      tenant,
      monthlyAmount: monthlyAmount.toString(), // BigInt to string for localStorage
      totalMonths,
      basename: nameToUse,
      timestamp: Date.now(),
    };

    persistPendingDeployment(pendingDeployment);
    console.log('💾 Persisted pending deployment to localStorage');

    writeContract({
      address: FACTORY_ADDRESS,
      abi: RENTAL_FACTORY_ABI,
      functionName: 'deployRental',
      args: [landlord, tenant, monthlyAmount, totalMonths, nameToUse],
    });
  };

  /**
   * Create database record after successful deployment
   */
  useEffect(() => {
    if (isSuccess && predictedAddress && lastDeployedConfig) {
      const createDatabaseRecord = async () => {
        try {
          console.log('✅ Deployment confirmed! Storing in database...');

          // 🔥 UPDATED: Use new API endpoint instead of direct Supabase calls
          const pendingDeployment: PendingDeployment = {
            landlord: lastDeployedConfig.landlord,
            tenant: lastDeployedConfig.tenant,
            monthlyAmount: lastDeployedConfig.monthlyAmount.toString(),
            totalMonths: lastDeployedConfig.totalMonths,
            basename: lastDeployedConfig.basename,
            timestamp: Date.now(),
            txHash: hash,
          };

          const success = await storeContractInDatabase(
            predictedAddress,
            pendingDeployment
          );

          if (success) {
            // 🔥 NEW: Clear localStorage on successful storage
            clearPendingDeployment();
            console.log('✅ Contract stored and localStorage cleared');
          } else {
            console.warn('⚠️ Failed to store contract, but will retry on next app load');
            // Keep in localStorage for recovery
          }
        } catch (error) {
          console.error('Failed to create contract record:', error);
          // Don't clear localStorage - let recovery handle it
          // Blockchain is source of truth; database can be re-synced later
        }
      };

      createDatabaseRecord();
    }
  }, [isSuccess, predictedAddress, lastDeployedConfig, hash]);

  return {
    generateName,
    deployContract,
    suggestedName,
    predictedAddress,
    isDeploying: isPending || isConfirming,
    isSuccess,
    deploymentHash: hash,
  };
}
