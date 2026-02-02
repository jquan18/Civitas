import dotenv from 'dotenv'
import path from 'path'

// Load .env from repository root (parent of backend directory)
dotenv.config({ path: path.join(__dirname, '../../..', '.env') })

interface Environment {
  NODE_ENV: string
  PORT: number
  FRONTEND_URL: string
  BASE_RPC_URL: string
  FACTORY_ADDRESS: `0x${string}`
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string
  KEEPER_PRIVATE_KEY?: string
}

function validateEnv(): Environment {
  const required = [
    'BASE_RPC_URL',
    'FACTORY_ADDRESS',
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
    BASE_RPC_URL: process.env.BASE_RPC_URL!,
    FACTORY_ADDRESS: process.env.FACTORY_ADDRESS as `0x${string}`,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    KEEPER_PRIVATE_KEY: process.env.KEEPER_PRIVATE_KEY,
  }
}

export const env = validateEnv()
