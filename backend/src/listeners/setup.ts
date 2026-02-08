import { publicClient } from '@/config/blockchain'
import { env } from '@/config/environment'
import { getFactoryAddress } from '@/lib/contracts/constants'
import { handleRentVaultCreated } from './handlers/rentVaultCreated'
import { handleGroupBuyEscrowCreated } from './handlers/groupBuyEscrowCreated'
import { handleTreasuryCreated } from './handlers/treasuryCreated'
import { logger } from '@/utils/logger'

const POLL_INTERVAL_MS = 10_000
const LOOKBACK_BLOCKS = 2n

/**
 * Start CivitasFactory event listener.
 * Polls for all 3 creation events in a single loop.
 */
async function startCivitasFactoryListener() {
  const factoryAddress = getFactoryAddress(env.NETWORK_MODE)

  try {
    let lastProcessedBlock = await publicClient.getBlockNumber()

    if (lastProcessedBlock > LOOKBACK_BLOCKS) {
      lastProcessedBlock -= LOOKBACK_BLOCKS
    }

    logger.info('CivitasFactory event listener started (polling)', {
      fromBlock: lastProcessedBlock,
      factoryAddress,
      networkMode: env.NETWORK_MODE,
    })

    setInterval(async () => {
      try {
        const latestBlock = await publicClient.getBlockNumber()

        if (latestBlock <= lastProcessedBlock) {
          return
        }

        const fromBlock = lastProcessedBlock + 1n
        const toBlock = latestBlock

        // Fetch all 3 event types in parallel
        const [rvLogs, gbLogs, trLogs] = await Promise.all([
          publicClient.getLogs({
            address: factoryAddress,
            event: {
              type: 'event' as const,
              name: 'RentVaultCreated',
              inputs: [
                { name: 'creator', type: 'address', indexed: true },
                { name: 'clone', type: 'address', indexed: true },
                { name: 'recipient', type: 'address', indexed: true },
              ],
            },
            fromBlock,
            toBlock,
          }),
          publicClient.getLogs({
            address: factoryAddress,
            event: {
              type: 'event' as const,
              name: 'GroupBuyEscrowCreated',
              inputs: [
                { name: 'creator', type: 'address', indexed: true },
                { name: 'clone', type: 'address', indexed: true },
                { name: 'recipient', type: 'address', indexed: true },
              ],
            },
            fromBlock,
            toBlock,
          }),
          publicClient.getLogs({
            address: factoryAddress,
            event: {
              type: 'event' as const,
              name: 'TreasuryCreated',
              inputs: [
                { name: 'creator', type: 'address', indexed: true },
                { name: 'clone', type: 'address', indexed: true },
                { name: 'owner_', type: 'address', indexed: true },
              ],
            },
            fromBlock,
            toBlock,
          }),
        ])

        const handlers: Promise<void>[] = []

        for (const log of rvLogs) {
          handlers.push(handleRentVaultCreated(log).catch((error) => {
            logger.error('Error handling RentVaultCreated', { error, log })
          }) as Promise<void>)
        }
        for (const log of gbLogs) {
          handlers.push(handleGroupBuyEscrowCreated(log).catch((error) => {
            logger.error('Error handling GroupBuyEscrowCreated', { error, log })
          }) as Promise<void>)
        }
        for (const log of trLogs) {
          handlers.push(handleTreasuryCreated(log).catch((error) => {
            logger.error('Error handling TreasuryCreated', { error, log })
          }) as Promise<void>)
        }

        if (handlers.length > 0) {
          await Promise.allSettled(handlers)
        }

        lastProcessedBlock = latestBlock
      } catch (error) {
        logger.error('Event listener poll error - CivitasFactory', { error })
      }
    }, POLL_INTERVAL_MS)
  } catch (error) {
    logger.error('Failed to initialize CivitasFactory event listener', { error })
    throw error
  }
}

export function startEventListeners() {
  startCivitasFactoryListener()
}
