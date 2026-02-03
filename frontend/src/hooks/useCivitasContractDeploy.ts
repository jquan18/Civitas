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
  const [deploymentParams, setDeploymentParams] = useState<DeploymentParams | null>(null);
  const [hasStored, setHasStored] = useState(false);

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

    // Reset state for new deployment
    setHasStored(false);
    setDeployedAddress(null);
    setSelectedTemplate(template);
    setDeploymentParams(params);

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

    console.log('🚀 Calling factory function:', functionName);
    console.log('📋 With args:', args);
    console.log('🏭 Factory address:', factoryAddress);

    // Optional simulation (non-blocking) - wallet will do its own validation
    if (publicClient) {
      try {
        console.log('🔍 Pre-simulating transaction...');
        await publicClient.simulateContract({
          address: factoryAddress,
          abi: CIVITAS_FACTORY_ABI,
          functionName: functionName as any,
          args,
          account: address,
        });
        console.log('✅ Pre-simulation successful!');
      } catch (simulationError: any) {
        console.warn('⚠️ Pre-simulation failed (non-blocking):', simulationError.message);
        console.log('Proceeding anyway - wallet will validate the transaction');
        // Don't throw - let the wallet handle validation
      }
    }

    try {
      writeContract({
        address: factoryAddress,
        abi: CIVITAS_FACTORY_ABI,
        functionName: functionName as any,
        args,
      });
    } catch (error: any) {
      console.error('❌ Write contract error:', error);
      clearPendingDeployment();
      throw error;
    }
  };

  /**
   * Auto-store contract in database after successful deployment
   */
  useEffect(() => {
    if (!isSuccess || !receipt || !selectedTemplate || !address || isStoring || !deploymentParams || hasStored) return;

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

        // Build config object based on template
        let config: any = {};

        switch (selectedTemplate) {
          case CONTRACT_TEMPLATES.RENT_VAULT: {
            const p = deploymentParams as RentVaultParams;
            config = {
              recipient: p.recipient,
              rentAmount: p.rentAmount.toString(),
              dueDate: p.dueDate.toString(),
              tenants: p.tenants,
              shareBps: p.shareBps.map(s => s.toString()),
            };
            break;
          }
          case CONTRACT_TEMPLATES.GROUP_BUY_ESCROW: {
            const p = deploymentParams as GroupBuyEscrowParams;
            config = {
              recipient: p.recipient,
              fundingGoal: p.fundingGoal.toString(),
              expiryDate: p.expiryDate.toString(),
              timelockRefundDelay: p.timelockRefundDelay.toString(),
              participants: p.participants,
              shareBps: p.shareBps.map(s => s.toString()),
            };
            break;
          }
          case CONTRACT_TEMPLATES.STABLE_ALLOWANCE_TREASURY: {
            const p = deploymentParams as StableAllowanceTreasuryParams;
            config = {
              owner: p.owner,
              recipient: p.recipient,
              allowancePerIncrement: p.allowancePerIncrement.toString(),
            };
            break;
          }
        }

        // Store in database via API route
        console.log('💾 Storing contract in database...');

        const response = await fetch('/api/contracts/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contract_address: contractAddress,
            template_id: selectedTemplate,
            creator_address: address,
            chain_id: chainId,
            state: 0, // Deployed state
            basename: null, // Can add basename support later
            config,
            transaction_hash: hash,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('❌ API error:', errorData);
          throw new Error(errorData.error || 'Failed to store contract');
        }

        const result = await response.json();

        if (result.success) {
          clearPendingDeployment();
          setDeployedAddress(contractAddress);
          setHasStored(true); // Mark as stored to prevent duplicate attempts
          console.log('✅ Contract stored in database:', result.contract.id);
          console.log('🎉 Deployment complete! Contract address:', contractAddress);
        } else {
          console.warn('⚠️ Failed to store contract');
        }
      } catch (error: any) {
        console.error('Failed to process deployment:', error);
        // If it's a duplicate key error, it means we already stored it successfully
        if (error.message?.includes('duplicate key')) {
          console.log('ℹ️ Contract already stored (duplicate prevented)');
          setDeployedAddress(contractAddress);
          setHasStored(true);
        }
      } finally {
        setIsStoring(false);
      }
    };

    storeContract();
  }, [isSuccess, receipt, selectedTemplate, address, hash, isStoring, deploymentParams, chainId, hasStored]);

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
