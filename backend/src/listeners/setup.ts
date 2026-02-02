import { publicClient } from '@/config/blockchain'
import { RENTAL_FACTORY_ABI } from '@/lib/contracts/abis'
import { env } from '@/config/environment'
import { handleContractDeployed } from './handlers/contractDeployed'
import { logger } from '@/utils/logger'

const POLL_INTERVAL_MS = 10_000
const LOOKBACK_BLOCKS = 2n

/**
 * Start factory event listener using log polling.
 * This avoids RPC "filter not found" errors on public HTTP endpoints.
 */
async function startFactoryListener() {
  try {
    let lastProcessedBlock = await publicClient.getBlockNumber()

    if (lastProcessedBlock > LOOKBACK_BLOCKS) {
      lastProcessedBlock -= LOOKBACK_BLOCKS
    }

    logger.info('Factory event listener started (polling)', {
      fromBlock: lastProcessedBlock,
    })

    setInterval(async () => {
      try {
        const latestBlock = await publicClient.getBlockNumber()

        if (latestBlock <= lastProcessedBlock) {
          return
        }

        const fromBlock = lastProcessedBlock + 1n
        const toBlock = latestBlock

        const logs = await publicClient.getLogs({
          address: env.FACTORY_ADDRESS,
          abi: RENTAL_FACTORY_ABI,
          eventName: 'RentalDeployed',
          fromBlock,
          toBlock,
        })

        if (logs.length > 0) {
          await Promise.allSettled(
            logs.map((log) =>
              handleContractDeployed(log).catch((error) => {
                logger.error('Error handling RentalDeployed event', {
                  error,
                  log,
                })
              })
            )
          )
        }

        lastProcessedBlock = latestBlock
      } catch (error) {
        logger.error('Event listener poll error - RentalDeployed', { error })
      }
    }, POLL_INTERVAL_MS)
  } catch (error) {
    logger.error('Failed to initialize event listener', { error })
    throw error // Fail fast on startup
  }
}

export function startEventListeners() {
  startFactoryListener()
}
