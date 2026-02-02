import { createServiceClient } from './server'
import type { Database } from './types'

type User = Database['public']['Tables']['users']['Row']

/**
 * Get or create user by wallet address
 */
export async function getOrCreateUser(walletAddress: string, ensName?: string): Promise<User> {
  const supabase = createServiceClient()

  // Try to fetch existing user
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('wallet_address', walletAddress)
    .single()

  if (existingUser) {
    // Update ENS name if provided and different
    if (ensName && existingUser.ens_name !== ensName) {
      const { data: updatedUser, error } = await supabase
        .from('users')
        .update({ ens_name: ensName })
        .eq('wallet_address', walletAddress)
        .select()
        .single()

      if (error) {
        console.error('Supabase error updating user ENS name:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        })
        // Return existing user if update fails
        return existingUser
      }

      return updatedUser || existingUser
    }
    return existingUser
  }

  // Create new user
  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      wallet_address: walletAddress,
      ens_name: ensName,
    })
    .select()
    .single()

  if (error) {
    console.error('Supabase error creating user:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    })
    throw new Error(`Failed to create user: ${error.message}`, { cause: error })
  }

  return newUser
}

/**
 * Update user ENS name
 */
export async function updateUserEnsName(walletAddress: string, ensName: string): Promise<User> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('users')
    .update({ ens_name: ensName })
    .eq('wallet_address', walletAddress)
    .select()
    .single()

  if (error) {
    console.error('Supabase error updating user ENS name:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    })
    throw new Error(`Failed to update user: ${error.message}`, { cause: error })
  }

  return data
}

/**
 * Get user by wallet address
 */
export async function getUserByAddress(walletAddress: string): Promise<User | null> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('wallet_address', walletAddress)
    .single()

  if (error) {
    console.error('Supabase error fetching user:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    })
    return null
  }

  return data
}

/**
 * Create user-contract relationship
 */
export async function createUserContractRelation(
  userAddress: string,
  contractAddress: string,
  role: 'landlord' | 'tenant'
): Promise<void> {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('user_contracts')
    .insert({
      user_address: userAddress,
      contract_address: contractAddress,
      role,
    })

  if (error) {
    console.error('Supabase error creating user-contract relation:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    })
    throw new Error(`Failed to create relationship: ${error.message}`, { cause: error })
  }
}
