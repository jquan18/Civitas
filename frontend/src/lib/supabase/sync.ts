import { getUserContracts, updateContract } from './contracts'
import { getOrCreateUser } from './users'
import type { Database } from './types'

type RentalContract = Database['public']['Tables']['rental_contracts']['Row']

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

  // Update contract in database
  const updated = await updateContract(contractAddress, {
    landlord_address: blockchainData.landlord,
    tenant_address: blockchainData.tenant !== '0x0000000000000000000000000000000000000000'
      ? blockchainData.tenant
      : null,
    monthly_amount: Number(blockchainData.monthlyAmount),
    total_months: blockchainData.totalMonths,
    start_timestamp: Number(blockchainData.startTimestamp),
    state: blockchainData.state,
    termination_initiated_at: blockchainData.terminationInitiatedAt > 0n
      ? Number(blockchainData.terminationInitiatedAt)
      : null,
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
