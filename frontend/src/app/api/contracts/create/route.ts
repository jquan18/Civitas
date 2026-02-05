import { NextRequest, NextResponse } from 'next/server';
import { createGenericContract } from '@/lib/supabase/generic-contracts';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      contract_address,
      template_id,
      creator_address,
      chain_id,
      state,
      basename,
      config,
      transaction_hash,
    } = body;

    // Validate required fields
    if (!contract_address || !template_id || !creator_address || !config) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // chain_id is required - no default to prevent accidental testnet/mainnet mismatch
    if (!chain_id) {
      return NextResponse.json(
        { error: 'chain_id is required' },
        { status: 400 }
      );
    }

    // Create contract in database
    const contract = await createGenericContract({
      contract_address,
      template_id,
      creator_address,
      chain_id,
      state: state ?? 0, // Default to Deployed state
      basename: basename || null,
      config,
      on_chain_state: null, // Will be populated during sync
    });

    console.log('✅ Contract stored in database:', contract.id);

    return NextResponse.json({
      success: true,
      contract,
    });
  } catch (error: any) {
    console.error('❌ Failed to create contract:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create contract' },
      { status: 500 }
    );
  }
}
