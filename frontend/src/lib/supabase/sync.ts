import { getUserContracts, updateGenericContract } from './generic-contracts'
import { getOrCreateUser } from './users'
import type { Database } from './types'

type RentalContract = Database['public']['Tables']['contracts']['Row']

/**
 * Sync contract data from blockchain to Supabase
 * This should be called periodically or when contracts are accessed
 */
export async function syncContractFromBlockchain(
  contractAddress: string,
  blockchainData: {
    landlord: string
    tenant: string
    monthlyAmount: bigint
    totalMonths: number
    startTimestamp: bigint
    state: number
    terminationInitiatedAt: bigint
  }
): Promise<RentalContract> {
  // Ensure landlord user exists
  await getOrCreateUser(blockchainData.landlord)

  // Ensure tenant user exists if set
  if (blockchainData.tenant !== '0x0000000000000000000000000000000000000000') {
    await getOrCreateUser(blockchainData.tenant)
  }

  // Update contract in database using generic contract update
  const updated = await updateGenericContract(contractAddress, {
    state: blockchainData.state,
  })

  return updated
}

/**
 * Check if contract data is stale and needs re-sync
 * Stale = last_synced_at > 5 minutes ago
 */
export function isContractStale(contract: RentalContract): boolean {
  const STALE_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes
  const lastSynced = new Date(contract.last_synced_at || 0).getTime()
  return Date.now() - lastSynced > STALE_THRESHOLD_MS
}
