import { useEffect, useState } from 'react';
import { useAccount, useChainId } from 'wagmi';
import {
  getPendingDeployment,
  attemptRecovery,
  type PendingDeployment,
} from '@/lib/contracts/recovery';

export function useContractRecovery() {
  const { address } = useAccount();
  const chainId = useChainId();
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryResult, setRecoveryResult] = useState<{
    recovered: boolean;
    contractAddress?: string;
    reason?: string;
  } | null>(null);

  useEffect(() => {
    if (!address) return;

    const checkAndRecover = async () => {
      setIsRecovering(true);

      try {
        const pending = getPendingDeployment();

        if (!pending) {
          setIsRecovering(false);
          return;
        }

        console.log('🔍 Found pending deployment:', pending);

        // Only attempt recovery if the deployer matches current wallet
        if (pending.landlord.toLowerCase() !== address.toLowerCase()) {
          console.log('⚠️ Pending deployment belongs to different wallet, skipping');
          setIsRecovering(false);
          return;
        }

        console.log('🔄 Attempting recovery...');
        const result = await attemptRecovery(pending, chainId);

        setRecoveryResult(result);

        if (result.recovered) {
          console.log('✅ Recovery successful:', result);
        } else {
          console.log('⚠️ Recovery not completed:', result.reason);
        }

      } catch (error) {
        console.error('Recovery check failed:', error);
      } finally {
        setIsRecovering(false);
      }
    };

    // Run recovery check on mount and when wallet connects
    checkAndRecover();
  }, [address, chainId]);

  return {
    isRecovering,
    recoveryResult,
  };
}
