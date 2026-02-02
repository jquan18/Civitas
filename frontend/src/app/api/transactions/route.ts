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

    if (!userAddress) {
      return NextResponse.json(
        { error: 'user_address parameter is required' },
        { status: 400 }
      );
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

    // Build query to fetch contract events for user's contracts
    let query = supabase
      .from('contract_events')
      .select(`
        *,
        rental_contracts!inner(
          basename,
          contract_address,
          user_contracts!inner(
            role,
            user_address
          )
        )
      `)
      .eq('rental_contracts.user_contracts.user_address', userAddress)
      .order('created_at', { ascending: false })
      .limit(50);

    // Filter by event type if provided
    if (eventType && eventType !== 'all') {
      query = query.eq('event_type', eventType);
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
    const transactions = data?.map((event: any) => ({
      id: event.id,
      event_type: event.event_type,
      contract_address: event.contract_address,
      basename: event.rental_contracts?.basename || null,
      transaction_hash: event.transaction_hash,
      block_number: event.block_number,
      event_data: event.event_data,
      created_at: event.created_at,
      role: event.rental_contracts?.user_contracts?.[0]?.role || null,
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
