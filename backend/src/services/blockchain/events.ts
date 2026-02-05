import { publicClient } from '@/config/blockchain'
import { RENT_VAULT_ABI, GROUP_BUY_ESCROW_ABI, STABLE_ALLOWANCE_TREASURY_ABI } from '@/lib/contracts/abis'
import { createContractTransaction } from '@/lib/supabase/transactions'
import { logger } from '@/utils/logger'
import type { Address } from 'viem'
import { decodeEventLog } from 'viem'

/**
 * Sync all events for a specific contract address
 */
export async function syncContractEvents(contractAddress: string, templateId: string) {
    try {
        const address = contractAddress as Address
        let abi: any

        // Determine ABI based on template structure
        switch (templateId) {
            case 'rent_vault':
            case 'RentVault':
                abi = RENT_VAULT_ABI
                break
            case 'group_buy_escrow':
            case 'GroupBuyEscrow':
                abi = GROUP_BUY_ESCROW_ABI
                break
            case 'stable_allowance_treasury':
            case 'StableAllowanceTreasury':
                abi = STABLE_ALLOWANCE_TREASURY_ABI
                break
            default:
                logger.warn(`Unknown template ID for event sync: ${templateId}`)
                return
        }

        // Fetch logs from the last 10000 blocks (or however far back we want to syncing)
        // For production, we should track last synced block, but for "sync now" button,
        // getting last N blocks is acceptable.
        const currentBlock = await publicClient.getBlockNumber()
        const fromBlock = currentBlock - 10000n

        logger.info('Starting event sync', {
            contractAddress,
            templateId,
            fromBlock: fromBlock.toString(),
            toBlock: currentBlock.toString(),
        })

        const logs = await publicClient.getLogs({
            address,
            fromBlock,
            toBlock: currentBlock,
        })

        logger.info('Fetched logs from blockchain', {
            contractAddress,
            logCount: logs.length,
            blockRange: `${fromBlock} - ${logs.length > 0 ? logs[logs.length - 1].blockNumber : currentBlock}`,
        })

        for (const log of logs) {
            try {
                const decoded = decodeEventLog({
                    abi,
                    data: log.data,
                    topics: log.topics,
                }) as { eventName: string; args: Record<string, any> }

                const eventName = decoded.eventName
                const args = decoded.args
                const block = await publicClient.getBlock({ blockNumber: log.blockNumber })

                // Determine transaction type and from_address based on event
                let transactionType = 'interaction'
                let fromAddress: string | null = null

                // Try to get initiator from transaction receipt if possible, or infer from args
                // Since getTransactionReceipt is expensive for many logs, we'll try to use args first
                // Common patterns: 'depositor', 'caller', 'recipient', 'owner'

                if (eventName === 'Deposited') {
                    transactionType = 'deposit'
                    fromAddress = args.from || args.tenant || args.participant || args.depositor || args.sender
                } else if (eventName === 'Withdrawn') {
                    transactionType = 'withdrawal'
                    fromAddress = args.recipient || args.owner || args.to
                } else if (eventName === 'WithdrawnToLandlord') {
                    transactionType = 'withdrawal'
                    fromAddress = args.landlord
                } else if (eventName === 'Refunded') {
                    transactionType = 'refund'
                    fromAddress = args.tenant || args.participant || args.recipient
                } else if (eventName === 'Claimed') {
                    transactionType = 'claim'
                    fromAddress = args.recipient
                } else if (eventName === 'AllowanceClaimed') {
                    transactionType = 'claim'
                    fromAddress = args.recipient
                } else if (eventName === 'ApprovalIncremented') {
                    transactionType = 'approval'
                    fromAddress = args.owner
                } else if (eventName === 'EmergencyWithdrawal') {
                    transactionType = 'withdrawal'
                    fromAddress = args.to
                } else if (eventName === 'GoalReached') {
                    transactionType = 'goal_reached'
                    fromAddress = null // System event
                } else if (eventName === 'RentFullyFunded') {
                    transactionType = 'goal_reached'
                    fromAddress = null // System event
                } else if (eventName === 'FundsReleased') {
                    transactionType = 'funds_released'
                    fromAddress = args.purchaser
                } else if (eventName === 'DeliveryConfirmed') {
                    transactionType = 'delivery_confirmed'
                    fromAddress = args.recipient
                } else if (eventName === 'VoteCast') {
                    transactionType = 'vote'
                    fromAddress = args.participant
                } else if (eventName === 'TimelockRefund') {
                    transactionType = 'refund'
                    fromAddress = args.participant
                } else if (eventName === 'StateChanged') {
                    transactionType = 'state_change'
                    fromAddress = null // System event
                }

                // If fromAddress is still missing, we could fetch transaction receipt
                if (!fromAddress) {
                    try {
                        const tx = await publicClient.getTransaction({ hash: log.transactionHash })
                        fromAddress = tx.from
                    } catch (e) {
                        logger.warn('Failed to fetch tx for from_address', { hash: log.transactionHash })
                    }
                }

                // Prepare event data
                const eventData = {
                    eventName,
                    args: serializeBigInts(args)
                }

                logger.info('Successfully decoded event', {
                    contractAddress,
                    eventName,
                    transactionType,
                    transactionHash: log.transactionHash,
                    fromAddress,
                })

                await createContractTransaction({
                    transaction_hash: log.transactionHash,
                    contract_address: address.toLowerCase(),
                    transaction_type: formatEventType(transactionType),
                    template_id: templateId,
                    event_data: eventData,
                    block_number: Number(log.blockNumber),
                    block_timestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
                    log_index: Number(log.logIndex),
                    from_address: fromAddress ? fromAddress.toLowerCase() : null
                })

            } catch (decodeError: any) {
                // Log decode failure for debugging
                logger.warn('Failed to decode event log', {
                    contractAddress,
                    transactionHash: log.transactionHash,
                    logIndex: log.logIndex,
                    error: decodeError.message,
                    topics: log.topics,
                })
                continue
            }
        }

        logger.info('Event sync completed', {
            contractAddress,
            totalLogsProcessed: logs.length,
        })

        return logs.length

    } catch (error) {
        logger.error('Error syncing contract events', { error, contractAddress })
        throw error
    }
}

function serializeBigInts(obj: any): any {
    return JSON.parse(JSON.stringify(obj, (_key, value) =>
        typeof value === 'bigint'
            ? value.toString()
            : value
    ))
}

function formatEventType(type: string): string {
    return type.toLowerCase().replace(/\s+/g, '_')
}
