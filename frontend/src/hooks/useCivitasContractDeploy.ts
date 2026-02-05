import { useState, useEffect, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId, usePublicClient } from 'wagmi';
import { CIVITAS_FACTORY_ADDRESS, CONTRACT_TEMPLATES, type ContractTemplate, getExplorerTxUrl } from '@/lib/contracts/constants';
import { CIVITAS_FACTORY_ABI } from '@/lib/contracts/abis';
import { decodeEventLog } from 'viem';

// Simple localStorage-based recovery
interface PendingDeployment {
  templateId: string;
  params: any;
  txHash: string;
  timestamp: number;
}

const PENDING_KEY = 'civitas_pending_deployment';

function persistPendingDeployment(data: PendingDeployment) {
  localStorage.setItem(PENDING_KEY, JSON.stringify(data, (_, v) =>
    typeof v === 'bigint' ? v.toString() : v
  ));
}

function clearPendingDeployment() {
  localStorage.removeItem(PENDING_KEY);
}

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

export type EnsStep = 'idle' | 'generating' | 'registering' | 'done' | 'skipped';

export function useCivitasContractDeploy() {
  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();

  // State declarations - MUST come before useEffect hooks that reference them
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [deployedAddress, setDeployedAddress] = useState<`0x${string}` | null>(null);
  const [isStoring, setIsStoring] = useState(false);
  const [deploymentParams, setDeploymentParams] = useState<DeploymentParams | null>(null);
  const [hasStored, setHasStored] = useState(false);

  // ENS state
  const [ensStep, setEnsStep] = useState<EnsStep>('idle');
  const [ensName, setEnsName] = useState<string | null>(null);
  const [ensError, setEnsError] = useState<string | null>(null);

  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const {
    data: receipt,
    isLoading: isConfirming,
    isSuccess,
    error: confirmError
  } = useWaitForTransactionReceipt({
    hash,
  });

  // ENS registration uses a separate writeContract instance
  const {
    writeContract: writeEnsContract,
    data: ensHash,
    isPending: isEnsPending,
    error: ensWriteError,
  } = useWriteContract();
  const {
    data: ensReceipt,
    isLoading: isEnsConfirming,
    isSuccess: isEnsSuccess,
    error: ensConfirmError,
  } = useWaitForTransactionReceipt({
    hash: ensHash,
  });

  // Debug logging and persist pending deployment
  useEffect(() => {
    if (hash) {
      console.log('');
      console.log('========================================');
      console.log('📝 TRANSACTION SUBMITTED');
      console.log('========================================');
      console.log('Transaction Hash:', hash);
      console.log('Chain ID:', chainId);
      console.log('BaseScan URL:', getExplorerTxUrl(chainId, hash));
      console.log('');
      console.log('🔍 IMMEDIATE CHECK:');
      console.log('   1. Open BaseScan URL above');
      console.log('   2. Does the transaction appear?');
      console.log('   3. If NOT found → RPC issue (frontend not using Alchemy)');
      console.log('   4. If found → Success! RPC is working');
      console.log('========================================');

      // Persist deployment to localStorage for recovery
      if (selectedTemplate && deploymentParams) {
        const pendingDeployment: PendingDeployment = {
          templateId: selectedTemplate,
          params: deploymentParams,
          txHash: hash,
          timestamp: Date.now(),
        };
        persistPendingDeployment(pendingDeployment);
        console.log('💾 Persisted pending deployment to localStorage');
      }
    }
  }, [hash, chainId, selectedTemplate, deploymentParams]);

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
    setEnsStep('idle');
    setEnsName(null);
    setEnsError(null);

    // Note: We'll persist the deployment AFTER getting the transaction hash
    // (the PendingDeployment interface requires txHash, which we don't have yet)


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
          args: args as any,
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
      console.log('');
      console.log('========================================');
      console.log('🚀 CALLING WRITECONTRACT');
      console.log('========================================');
      console.log('Chain ID:', chainId);
      console.log('Factory:', factoryAddress);
      console.log('Function:', functionName);
      console.log('Args:', args);
      console.log('');
      console.log('⏳ Waiting for wallet approval...');
      console.log('========================================');

      writeContract({
        address: factoryAddress,
        abi: CIVITAS_FACTORY_ABI,
        functionName: functionName as any,
        args: args as any,
      });
    } catch (error: any) {
      console.error('❌ Write contract error:', error);
      clearPendingDeployment();
      throw error;
    }
  };

  /**
   * Build ENS text record keys/values based on template type
   */
  const buildENSRecords = useCallback((
    template: ContractTemplate,
    params: DeploymentParams,
    creatorAddress: string,
  ): { keys: string[]; values: string[] } => {
    const keys: string[] = ['contract.type', 'contract.status', 'contract.creator'];
    const values: string[] = [template, 'deployed', creatorAddress];

    switch (template) {
      case CONTRACT_TEMPLATES.RENT_VAULT: {
        const p = params as RentVaultParams;
        keys.push('contract.rent.amount', 'contract.rent.dueDate');
        values.push(p.rentAmount.toString(), p.dueDate.toString());
        break;
      }
      case CONTRACT_TEMPLATES.GROUP_BUY_ESCROW: {
        const p = params as GroupBuyEscrowParams;
        keys.push('contract.escrow.goal', 'contract.escrow.expiry');
        values.push(p.fundingGoal.toString(), p.expiryDate.toString());
        break;
      }
      case CONTRACT_TEMPLATES.STABLE_ALLOWANCE_TREASURY: {
        const p = params as StableAllowanceTreasuryParams;
        keys.push('contract.allowance.amount');
        values.push(p.allowancePerIncrement.toString());
        break;
      }
    }

    return { keys, values };
  }, []);

  /**
   * Register ENS subdomain for a deployed contract (non-blocking)
   */
  const registerENS = useCallback(async (
    contractAddress: `0x${string}`,
    template: ContractTemplate,
    params: DeploymentParams,
    config: Record<string, any>,
  ) => {
    const factoryAddress = CIVITAS_FACTORY_ADDRESS[chainId];
    if (!factoryAddress || !address) {
      setEnsStep('skipped');
      return;
    }

    try {
      // Step 1: Generate name via AI
      setEnsStep('generating');
      console.log('🏷️ Generating ENS name...');

      const nameResponse = await fetch('/api/generate-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: template,
          config,
        }),
      });

      if (!nameResponse.ok) {
        throw new Error('Failed to generate ENS name');
      }

      const { suggestedName } = await nameResponse.json();
      console.log('🏷️ Generated name:', suggestedName);

      // Step 2: Build records
      const { keys, values } = buildENSRecords(template, params, address);

      // Step 3: Call factory to register subdomain
      setEnsStep('registering');
      console.log('📝 Registering ENS subdomain...');

      writeEnsContract({
        address: factoryAddress,
        abi: CIVITAS_FACTORY_ABI,
        functionName: 'createSubdomainAndSetRecords',
        args: [contractAddress, suggestedName, keys, values],
      });

      // Store the suggested name for later (we'll get the full name from the event)
      setEnsName(suggestedName);
    } catch (error: any) {
      console.error('❌ ENS registration error:', error);
      setEnsError(error.message || 'Failed to register ENS name');
      setEnsStep('skipped');
    }
  }, [chainId, address, buildENSRecords, writeEnsContract]);

  /**
   * Handle ENS transaction confirmation
   */
  useEffect(() => {
    if (!isEnsSuccess || !ensReceipt || !deployedAddress) return;

    // Parse the ENSRecordsSet event to get the full basename
    let fullBasename: string | null = null;
    const factoryAddress = CIVITAS_FACTORY_ADDRESS[chainId];

    for (const log of ensReceipt.logs) {
      try {
        if (log.address.toLowerCase() !== factoryAddress?.toLowerCase()) continue;

        const decoded = decodeEventLog({
          abi: CIVITAS_FACTORY_ABI,
          data: log.data,
          topics: log.topics,
        });

        if (decoded.eventName === 'ENSRecordsSet') {
          fullBasename = decoded.args.basename as string;
          console.log('🏷️ ENS registered:', fullBasename);
          break;
        }
      } catch {
        continue;
      }
    }

    if (fullBasename) {
      setEnsName(fullBasename);
      setEnsStep('done');

      // Update Supabase with the basename
      fetch('/api/contracts/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract_address: deployedAddress,
          basename: fullBasename,
        }),
      }).then(res => {
        if (res.ok) {
          console.log('✅ Basename stored in database');
        } else {
          console.warn('⚠️ Failed to store basename in database');
        }
      }).catch(err => {
        console.warn('⚠️ Failed to update basename:', err);
      });
    } else {
      // Transaction succeeded but couldn't parse event - use the suggested name
      setEnsStep('done');
      console.warn('⚠️ ENS tx confirmed but could not parse event for full basename');
    }
  }, [isEnsSuccess, ensReceipt, deployedAddress, chainId]);

  /**
   * Handle ENS write/confirm errors (non-blocking)
   */
  useEffect(() => {
    const error = ensWriteError || ensConfirmError;
    if (error && ensStep === 'registering') {
      console.error('❌ ENS transaction error:', error);
      setEnsError(error.message || 'ENS registration transaction failed');
      setEnsStep('skipped');
    }
  }, [ensWriteError, ensConfirmError, ensStep]);

  /**
   * Auto-store contract in database after successful deployment
   */
  useEffect(() => {
    if (!isSuccess || !receipt || !selectedTemplate || !address || isStoring || !deploymentParams || hasStored) return;

    const storeContract = async () => {
      let contractAddress: `0x${string}` | null = null;

      try {
        setIsStoring(true);
        console.log('✅ Transaction confirmed! Parsing logs...');

        // Parse the event logs to get the deployed contract address
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

        // FALLBACK: If receipt has no logs, fetch them manually
        // This is needed for Base mainnet's public RPC which sometimes returns empty logs
        let logsToProcess = receipt.logs;

        if (logsToProcess.length === 0 && publicClient && receipt.blockNumber && hash) {
          console.log('⚠️ Receipt has no logs, trying alternative methods...');

          try {
            // Method 1: Re-fetch the receipt (sometimes RPC needs a second request)
            console.log('🔄 Re-fetching transaction receipt...');
            const retryReceipt = await publicClient.getTransactionReceipt({ hash });
            if (retryReceipt && retryReceipt.logs.length > 0) {
              console.log(`✅ Retry successful! Found ${retryReceipt.logs.length} logs`);
              logsToProcess = retryReceipt.logs;
            } else {
              // Method 2: Query logs with a block range (some RPCs don't like single-block queries)
              console.log('🔄 Trying getLogs with block range...');
              const startBlock = receipt.blockNumber - 1n > 0n ? receipt.blockNumber - 1n : receipt.blockNumber;
              const fetchedLogs = await publicClient.getLogs({
                address: CIVITAS_FACTORY_ADDRESS[chainId],
                fromBlock: startBlock,
                toBlock: receipt.blockNumber + 1n,
              });

              // Filter to only logs from our transaction
              logsToProcess = fetchedLogs.filter(
                log => log.transactionHash?.toLowerCase() === hash.toLowerCase()
              ) as any[];

              console.log(`✅ Fetched ${logsToProcess.length} logs from block range`);
            }
          } catch (logError: any) {
            console.error('❌ Failed to fetch logs:', logError.message);
            console.log('💡 Tip: This may be an RPC provider issue. Try using a custom RPC endpoint (Alchemy, Infura, etc.)');
          }
        }

        // Find the event in the logs (check ALL logs, including from internal txs)
        for (const log of logsToProcess) {
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
              // Type narrowing: deployment events have 'clone', ENS events have 'contractAddress'
              if ('clone' in decoded.args) {
                contractAddress = decoded.args.clone as `0x${string}`;
              } else if ('contractAddress' in decoded.args) {
                contractAddress = decoded.args.contractAddress as `0x${string}`;
              }
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
          console.log('📋 All logs:', logsToProcess);
          console.log('🏭 Looking for events from factory:', CIVITAS_FACTORY_ADDRESS[chainId]);

          // Log all log addresses to help debug
          console.log('📍 Log addresses:', logsToProcess.map(l => l.address));

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
            basename: null, // Will be set after ENS registration
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

          // Kick off ENS registration (non-blocking)
          registerENS(contractAddress, selectedTemplate, deploymentParams, config);
        } else {
          console.warn('⚠️ Failed to store contract');
        }
      } catch (error: any) {
        console.error('Failed to process deployment:', error);
        // If it's a duplicate key error, it means we already stored it successfully
        if (error.message?.includes('duplicate key')) {
          console.log('ℹ️ Contract already stored (duplicate prevented)');
          if (contractAddress) {
            setDeployedAddress(contractAddress);
            setHasStored(true);
          }
        }
      } finally {
        setIsStoring(false);
      }
    };

    storeContract();
  }, [isSuccess, receipt, selectedTemplate, address, hash, isStoring, deploymentParams, chainId, hasStored, registerENS]);

  return {
    deployContract,
    selectedTemplate,
    deployedAddress,
    isDeploying: isPending || isConfirming || isStoring,
    isPending,
    isConfirming,
    isSuccess: isSuccess && !isStoring,
    deploymentHash: hash,
    error: writeError || confirmError,
    // ENS state
    ensStep,
    ensName,
    ensError,
    isEnsRegistering: isEnsPending || isEnsConfirming,
  };
}
