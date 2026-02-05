import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userAddress = searchParams.get('user_address');
    const eventType = searchParams.get('event_type');
    const contractAddress = searchParams.get('contract_address');

    if (!userAddress) {
      return NextResponse.json(
        { error: 'user_address parameter is required' },
        { status: 400 }
      );
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

    // query contract_transactions joined with contracts and contract_participants
    let query = supabase
      .from('contract_transactions')
      .select(`
        *,
        contracts!inner(
          id,
          contract_address,
          template_id,
          basename,
          contract_participants!inner(
            user_address,
            role
          )
        )
      `)
      .eq('contracts.contract_participants.user_address', userAddress.toLowerCase())
      .order('block_timestamp', { ascending: false })
      .limit(50);

    // Filter by contract_address if provided
    if (contractAddress) {
      query = query.eq('contract_address', contractAddress.toLowerCase());
    }

    // Filter by transaction_type (mapped from frontend event_type)
    if (eventType && eventType !== 'all') {
      // mapping frontend filter values to database transaction_type values if necessary
      // assuming 1:1 mapping for now, or 'created' -> 'deployment'
      if (eventType === 'created') {
        query = query.eq('transaction_type', 'deployment');
      } else {
        query = query.eq('transaction_type', eventType);
      }
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch transactions' },
        { status: 500 }
      );
    }

    // Transform data to flatten structure
    const transactions = data?.map((tx: any) => ({
      id: tx.id,
      event_type: tx.transaction_type, // Map back to event_type
      contract_address: tx.contract_address,
      basename: tx.contracts?.basename || null,
      transaction_hash: tx.transaction_hash,
      block_number: tx.block_number,
      event_data: tx.event_data,
      created_at: tx.block_timestamp, // Use block_timestamp
      role: tx.contracts?.contract_participants?.[0]?.role || null,
      from_address: tx.from_address || null,
      template_id: tx.contracts?.template_id || null,
    })) || [];

    return NextResponse.json({
      transactions,
      total: count || transactions.length,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
