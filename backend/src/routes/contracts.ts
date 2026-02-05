import { Router, Request, Response } from 'express'
import { syncGenericContract } from '@/services/blockchain/sync'
import {
  createGenericContract,
  getUserContracts as getGenericUserContracts,
  getContractByAddress as getGenericContractByAddress,
} from '@/lib/supabase/generic-contracts'
import { getTemplate } from '@/config/templates'
import { asyncHandler } from '@/utils/asyncHandler'
import { ValidationError, NotFoundError } from '@/utils/errors'
import { logger } from '@/utils/logger'
import type { Address } from 'viem'

const router: Router = Router()

/**
 * POST /api/contracts
 * Store a newly deployed contract (any template type)
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { template_id, contract_address, config, creator_address, basename, chain_id } = req.body

  if (!template_id || !contract_address || !config || !creator_address) {
    throw new ValidationError('template_id, contract_address, config, and creator_address are required')
  }
  // ... (validation checks remain same, just updating destructuring)

  const template = getTemplate(template_id)
  if (!template) {
    throw new ValidationError(`Unknown template: ${template_id}`)
  }

  if (!/^0x[a-fA-F0-9]{40}$/.test(contract_address)) {
    throw new ValidationError('Invalid contract address')
  }

  if (!/^0x[a-fA-F0-9]{40}$/.test(creator_address)) {
    throw new ValidationError('Invalid creator address')
  }

  logger.info('Storing new contract', { template_id, contract_address, creator_address })

  const contract = await createGenericContract({
    template_id,
    contract_address: contract_address.toLowerCase(),
    config,
    creator_address: creator_address.toLowerCase(),
    basename: basename || null,
    chain_id: chain_id || 84532, // Default to Base Sepolia
  })

  res.status(201).json({ contract })
}))

/**
 * GET /api/contracts
 * List contracts, optionally filtered by creator_address or user_address
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const userAddress = (req.query.user_address || req.query.creator_address) as string | undefined

  if (!userAddress) {
    throw new ValidationError('user_address or creator_address query parameter required')
  }

  if (!/^0x[a-fA-F0-9]{40}$/i.test(userAddress)) {
    throw new ValidationError('Invalid address format')
  }

  const contracts = await getGenericUserContracts(userAddress.toLowerCase())

  res.json({ contracts })
}))

/**
 * GET /api/contracts/:address
 * Get a single contract with on_chain_state
 */
router.get('/:address', asyncHandler(async (req: Request, res: Response) => {
  const address = req.params.address as string

  if (!/^0x[a-fA-F0-9]{40}$/i.test(address)) {
    throw new ValidationError('Invalid contract address')
  }

  const contract = await getGenericContractByAddress(address.toLowerCase())

  if (!contract) {
    throw new NotFoundError('Contract not found')
  }

  res.json({ contract })
}))

/**
 * PATCH /api/contracts/:address/sync
 * Trigger blockchain sync for a generic contract
 */
router.patch('/:address/sync', asyncHandler(async (req: Request, res: Response) => {
  const address = req.params.address as string

  if (!/^0x[a-fA-F0-9]{40}$/i.test(address)) {
    throw new ValidationError('Invalid contract address')
  }

  logger.info('Generic contract sync requested', { address })

  const contract = await syncGenericContract(address.toLowerCase() as Address)

  // Also sync events in parallel
  if (contract && contract.template_id) {
    // Run in background properly to avoid timeout, or await if we want user to see results immediately
    // For manual "Sync" button, awaiting is better UX so list updates immediately
    try {
      // Dynamic import to avoid circular dependency issues if any
      const { syncContractEvents } = await import('@/services/blockchain/events')
      await syncContractEvents(address.toLowerCase(), contract.template_id)
    } catch (e) {
      logger.error('Failed to sync events during manual sync', { error: e, address })
      // Don't fail the whole request, as state sync might have succeeded
    }
  }

  res.json({ contract })
}))

export default router
