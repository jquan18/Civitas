import { getGenericContractsByState } from '@/lib/supabase/generic-contracts'
import { syncGenericContract } from '@/services/blockchain/sync'
import { logger } from '@/utils/logger'

/**
 * Sync all active contracts from blockchain
 * Handles multi-template contracts from contracts table
 * Runs every 5 minutes
 */
export async function syncContractsJob() {
  try {
    // ── Multi-template contracts ──
    // Sync all non-terminal contracts (state 0 = deployed, not yet settled)
    // Each template may have different "active" states, so sync all non-final
    const genericContracts = await getGenericContractsByState(0)

    if (genericContracts.length > 0) {
      logger.info(`Syncing ${genericContracts.length} contracts`)

      const results = await Promise.allSettled(
        genericContracts.map((contract) =>
          syncGenericContract(contract.contract_address as `0x${string}`)
        )
      )

      const succeeded = results.filter((r) => r.status === 'fulfilled').length
      const failed = results.filter((r) => r.status === 'rejected').length
      logger.info('Contract sync complete', { succeeded, failed })

      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          logger.error('Contract sync failed', {
            contractAddress: genericContracts[index].contract_address,
            templateId: genericContracts[index].template_id,
            chainId: genericContracts[index].chain_id,
            error: result.reason, // Logger now handles Error serialization properly
          })
        }
      })
    }
  } catch (error) {
    logger.error('Sync job failed catastrophically', { error })
  }
}
