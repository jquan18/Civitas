import { createPublicClient, http } from 'viem'
import { baseSepolia } from 'viem/chains'
import { env } from './environment'

export const publicClient = createPublicClient({
  chain: baseSepolia,  // ✅ Fixed: Use Base Sepolia (chain ID 84532)
  transport: http(env.BASE_RPC_URL),
})
