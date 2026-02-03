import { createServiceClient } from './server'
import type { Database } from './types'

type Contract = Database['public']['Tables']['contracts']['Row']
type ContractInsert = Database['public']['Tables']['contracts']['Insert']
type ContractUpdate = Database['public']['Tables']['contracts']['Update']

export async function getContractByAddress(contractAddress: string): Promise<Contract | null> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('contract_address', contractAddress)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // not found
    throw new Error(`Failed to fetch contract: ${error.message}`, { cause: error })
  }

  return data
}

export async function getUserContracts(userAddress: string): Promise<Contract[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('creator_address', userAddress)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch user contracts: ${error.message}`, { cause: error })
  }

  return data || []
}

export async function createGenericContract(contract: ContractInsert): Promise<Contract> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('contracts')
    .insert(contract)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create contract: ${error.message}`, { cause: error })
  }

  return data
}

export async function updateGenericContract(
  contractAddress: string,
  updates: ContractUpdate
): Promise<Contract> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('contracts')
    .update({
      ...updates,
      last_synced_at: new Date().toISOString(),
    })
    .eq('contract_address', contractAddress)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update contract: ${error.message}`, { cause: error })
  }

  return data
}

export async function getContractsByTemplateAndState(
  templateId: string,
  state: number
): Promise<Contract[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('template_id', templateId)
    .eq('state', state)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch contracts: ${error.message}`, { cause: error })
  }

  return data || []
}

export async function getGenericContractsByState(state: number): Promise<Contract[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('state', state)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch contracts by state: ${error.message}`, { cause: error })
  }

  return data || []
}
