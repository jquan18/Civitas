import { createGenericContract } from '@/lib/supabase/generic-contracts'
import { syncGenericContract } from '@/services/blockchain/sync'
import { createContractTransaction } from '@/lib/supabase/transactions'
import { publicClient } from '@/config/blockchain'
import { logger } from '@/utils/logger'

export async function handleTreasuryCreated(log: any) {
  try {
    const cloneAddress = (log.args.clone as string).toLowerCase()
    const creator = (log.args.creator as string).toLowerCase()

    logger.info('New StableAllowanceTreasury created', {
      cloneAddress,
      creator,
      blockNumber: log.blockNumber,
      transactionHash: log.transactionHash,
    })

    await createGenericContract({
      contract_address: cloneAddress,
      template_id: 'stable_allowance_treasury',
      creator_address: creator,
      config: {},
    })

    // Create deployment transaction record
    const block = await publicClient.getBlock({ blockNumber: log.blockNumber })
    await createContractTransaction({
      transaction_hash: log.transactionHash,
      contract_address: cloneAddress,
      transaction_type: 'deployment',
      template_id: 'stable_allowance_treasury',
      event_data: {
        creator,
        owner: (log.args.owner_ as string).toLowerCase(),
      },
      block_number: Number(log.blockNumber),
      block_timestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
      log_index: Number(log.logIndex ?? 0),
      from_address: creator,
    })

    await syncGenericContract(cloneAddress as `0x${string}`)

    logger.info('StableAllowanceTreasury stored, deployment transaction recorded, and synced', { cloneAddress })
  } catch (error) {
    logger.error('Failed to handle TreasuryCreated event', { error, log })
    throw error
  }
}
