import dotenv from 'dotenv'
import path from 'path'

// Load .env from repository root (parent of backend directory)
dotenv.config({ path: path.join(__dirname, '../../..', '.env') })

export type NetworkMode = 'mainnet' | 'testnet'

interface Environment {
  NODE_ENV: string
  PORT: number
  FRONTEND_URL: string
  NETWORK_MODE: NetworkMode
  BASE_RPC_URL: string
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string
  KEEPER_PRIVATE_KEY?: string
}

function validateEnv(): Environment {
  const networkMode = (process.env.NETWORK_MODE || 'testnet') as NetworkMode
  if (networkMode !== 'mainnet' && networkMode !== 'testnet') {
    throw new Error(`Invalid NETWORK_MODE: ${networkMode}. Must be 'mainnet' or 'testnet'.`)
  }

  // Select the appropriate RPC URL based on network mode
  const rpcUrl = networkMode === 'mainnet'
    ? (process.env.BASE_MAINNET_RPC_URL || process.env.BASE_RPC_URL)
    : (process.env.BASE_TESTNET_RPC_URL || process.env.BASE_RPC_URL)

  if (!rpcUrl) {
    throw new Error(
      `Missing RPC URL. Set BASE_${networkMode.toUpperCase()}_RPC_URL or BASE_RPC_URL.`
    )
  }

  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]

  const missing = required.filter((key) => !process.env[key])

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }

  return {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '3001', 10),
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
    NETWORK_MODE: networkMode,
    BASE_RPC_URL: rpcUrl,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    KEEPER_PRIVATE_KEY: process.env.KEEPER_PRIVATE_KEY,
  }
}

export const env = validateEnv()
