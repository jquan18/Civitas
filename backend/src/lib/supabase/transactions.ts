import { createServiceClient } from './server'
import type { Database } from './types'

type ContractTransactionInsert = Database['public']['Tables']['contract_transactions']['Insert']

/**
 * store a contract transaction in the database
 */
export async function createContractTransaction(
    transaction: ContractTransactionInsert
): Promise<any> {
    const supabase = createServiceClient()

    const { data, error } = await supabase
        .from('contract_transactions')
        .upsert(transaction, {
            onConflict: 'transaction_hash, log_index',
        })
        .select()
        .single()

    if (error) {
        throw new Error(`Failed to create contract transaction: ${error.message}`, { cause: error })
    }

    return data
}
