import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId, usePublicClient } from 'wagmi';
import { CIVITAS_FACTORY_ADDRESS, CONTRACT_TEMPLATES, type ContractTemplate } from '@/lib/contracts/constants';
import { CIVITAS_FACTORY_ABI } from '@/lib/contracts/abis';
import {
  persistPendingDeployment,
  clearPendingDeployment,
  storeContractInDatabase,
  type PendingDeployment,
} from '@/lib/contracts/recovery';
import { decodeEventLog } from 'viem';

export interface RentVaultParams {
  recipient: `0x${string}`;
  rentAmount: bigint;
  dueDate: bigint;
  tenants: `0x${string}`[];
  shareBps: bigint[];
}

export interface GroupBuyEscrowParams {
  recipient: `0x${string}`;
  fundingGoal: bigint;
  expiryDate: bigint;
  timelockRefundDelay: bigint;
  participants: `0x${string}`[];
  shareBps: bigint[];
}

export interface StableAllowanceTreasuryParams {
  owner: `0x${string}`;
  recipient: `0x${string}`;
  allowancePerIncrement: bigint;
}

export type DeploymentParams = RentVaultParams | GroupBuyEscrowParams | StableAllowanceTreasuryParams;

export function useCivitasContractDeploy() {
  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const {
    data: receipt,
    isLoading: isConfirming,
    isSuccess,
    error: confirmError
  } = useWaitForTransactionReceipt({
    hash,
  });

  // Debug logging
  useEffect(() => {
    if (hash) {
      console.log('📝 Transaction submitted:', hash);
      console.log('🔗 View on BaseScan:', `https://sepolia.basescan.org/tx/${hash}`);
    }
  }, [hash]);

  useEffect(() => {
    if (isConfirming) {
      console.log('⏳ Waiting for confirmation...');
    }
  }, [isConfirming]);

  useEffect(() => {
    if (receipt) {
      console.log('📦 Receipt received:', receipt);
      console.log('🎯 Transaction status:', receipt.status);
      console.log('📋 Logs count:', receipt.logs.length);
    }
  }, [receipt]);

  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [deployedAddress, setDeployedAddress] = useState<`0x${string}` | null>(null);
  const [isStoring, setIsStoring] = useState(false);

  /**
   * Deploy contract based on selected template
   */
  const deployContract = async (template: ContractTemplate, params: DeploymentParams) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    const factoryAddress = CIVITAS_FACTORY_ADDRESS[chainId];
    if (!factoryAddress) {
      throw new Error('CivitasFactory not deployed on this network');
    }

    setSelectedTemplate(template);

    // Persist deployment intent to localStorage BEFORE deploying
    const pendingDeployment: PendingDeployment = {
      landlord: address,
      tenant: address, // For recovery purposes
      monthlyAmount: '0', // Not applicable for all templates
      totalMonths: 0,
      basename: template, // Use template name as identifier
      timestamp: Date.now(),
    };

    persistPendingDeployment(pendingDeployment);
    console.log('💾 Persisted pending deployment to localStorage');

    // Deploy based on template
    let functionName: string;
    let args: any[];

    switch (template) {
      case CONTRACT_TEMPLATES.RENT_VAULT: {
        const p = params as RentVaultParams;
        functionName = 'createRentVault';
        args = [p.recipient, p.rentAmount, p.dueDate, p.tenants, p.shareBps];
        break;
      }
      case CONTRACT_TEMPLATES.GROUP_BUY_ESCROW: {
        const p = params as GroupBuyEscrowParams;
        functionName = 'createGroupBuyEscrow';
        args = [p.recipient, p.fundingGoal, p.expiryDate, p.timelockRefundDelay, p.participants, p.shareBps];
        break;
      }
      case CONTRACT_TEMPLATES.STABLE_ALLOWANCE_TREASURY: {
        const p = params as StableAllowanceTreasuryParams;
        functionName = 'createStableAllowanceTreasury';
        args = [p.owner, p.recipient, p.allowancePerIncrement];
        break;
      }
      default:
        throw new Error(`Unknown template: ${template}`);
    }

    writeContract({
      address: factoryAddress,
      abi: CIVITAS_FACTORY_ABI,
      functionName: functionName as any,
      args,
    });
  };

  /**
   * Auto-store contract in database after successful deployment
   */
  useEffect(() => {
    if (!isSuccess || !receipt || !selectedTemplate || !address || isStoring) return;

    const storeContract = async () => {
      try {
        setIsStoring(true);
        console.log('✅ Transaction confirmed! Parsing logs...');

        // Parse the event logs to get the deployed contract address
        let contractAddress: `0x${string}` | null = null;
        let eventName: string = '';

        // Determine which event to look for based on template
        switch (selectedTemplate) {
          case CONTRACT_TEMPLATES.RENT_VAULT:
            eventName = 'RentVaultCreated';
            break;
          case CONTRACT_TEMPLATES.GROUP_BUY_ESCROW:
            eventName = 'GroupBuyEscrowCreated';
            break;
          case CONTRACT_TEMPLATES.STABLE_ALLOWANCE_TREASURY:
            eventName = 'TreasuryCreated';
            break;
        }

        console.log(`🔍 Looking for ${eventName} event in ${receipt.logs.length} logs...`);

        // Find the event in the logs (check ALL logs, including from internal txs)
        for (const log of receipt.logs) {
          try {
            // Only try to decode logs from the factory address
            const factoryAddress = CIVITAS_FACTORY_ADDRESS[chainId];
            if (log.address.toLowerCase() !== factoryAddress?.toLowerCase()) {
              continue; // Skip logs from other contracts
            }

            const decoded = decodeEventLog({
              abi: CIVITAS_FACTORY_ABI,
              data: log.data,
              topics: log.topics,
            });

            console.log(`📝 Found event: ${decoded.eventName}`);

            if (decoded.eventName === eventName) {
              contractAddress = decoded.args.clone as `0x${string}`;
              console.log(`📍 Found ${eventName} event, contract deployed at:`, contractAddress);
              break;
            }
          } catch (e) {
            // Skip logs that don't match our ABI
            continue;
          }
        }

        if (!contractAddress) {
          console.error('❌ Could not find contract address in logs');
          console.log('📋 All logs:', receipt.logs);
          console.log('🏭 Looking for events from factory:', CIVITAS_FACTORY_ADDRESS[chainId]);

          // Log all log addresses to help debug
          console.log('📍 Log addresses:', receipt.logs.map(l => l.address));

          setIsStoring(false);
          return;
        }

        // Store in database
        console.log('💾 Storing contract in database...');
        const pendingDeployment: PendingDeployment = {
          landlord: address,
          tenant: address,
          monthlyAmount: '0',
          totalMonths: 0,
          basename: selectedTemplate,
          timestamp: Date.now(),
          txHash: hash,
        };

        const success = await storeContractInDatabase(contractAddress, pendingDeployment);

        if (success) {
          clearPendingDeployment();
          setDeployedAddress(contractAddress);
          console.log('✅ Contract stored and localStorage cleared');
          console.log('🎉 Deployment complete! Contract address:', contractAddress);
        } else {
          console.warn('⚠️ Failed to store contract, but will retry on next app load');
        }
      } catch (error) {
        console.error('Failed to process deployment:', error);
      } finally {
        setIsStoring(false);
      }
    };

    storeContract();
  }, [isSuccess, receipt, selectedTemplate, address, hash, isStoring]);

  return {
    deployContract,
    selectedTemplate,
    deployedAddress,
    isDeploying: isPending || isConfirming || isStoring,
    isSuccess: isSuccess && !isStoring,
    deploymentHash: hash,
    error: writeError || confirmError,
  };
}
