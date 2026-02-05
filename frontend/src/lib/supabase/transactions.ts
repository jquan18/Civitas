import { createServiceClient } from './server';
import type { Database } from './types';

type ContractTransactionInsert = Database['public']['Tables']['contract_transactions']['Insert'];

/**
 * Store a contract transaction in the database
 * Uses service role key to bypass RLS
 */
export async function createContractTransaction(
  transaction: ContractTransactionInsert
): Promise<any> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('contract_transactions')
    .upsert(transaction, {
      onConflict: 'transaction_hash,log_index',
    })
    .select()
    .single();

  if (error) {
    console.error('Supabase error:', error);
    throw new Error(`Failed to create contract transaction: ${error.message}`);
  }

  return data;
}
