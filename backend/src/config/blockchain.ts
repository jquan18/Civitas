import { createPublicClient, http } from 'viem'
import { env } from './environment'
import { getChain } from '@/lib/contracts/constants'

export const publicClient = createPublicClient({
  chain: getChain(env.NETWORK_MODE),
  transport: http(env.BASE_RPC_URL),
})
