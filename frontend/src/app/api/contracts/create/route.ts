import { NextRequest, NextResponse } from 'next/server';
import { createGenericContract } from '@/lib/supabase/generic-contracts';
import { createContractTransaction } from '@/lib/supabase/transactions';
import { getPublicClient } from '@/lib/blockchain/provider';

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

    // Create contract in database
    const contract = await createGenericContract({
      contract_address,
      template_id,
      creator_address,
      chain_id: chain_id || 84532, // Default to Base Sepolia
      state: state ?? 0, // Default to Deployed state
      basename: basename || null,
      config,
      on_chain_state: null, // Will be populated during sync
    });

    console.log('✅ Contract stored in database:', contract.id);

    // ==========================================
    // NEW: Record deployment transaction
    // ==========================================
    if (transaction_hash) {
      try {
        const publicClient = getPublicClient(chain_id || 84532);

        // Fetch transaction receipt
        const receipt = await publicClient.getTransactionReceipt({
          hash: transaction_hash as `0x${string}`,
        });

        if (receipt) {
          // Fetch block for timestamp
          const block = await publicClient.getBlock({
            blockNumber: receipt.blockNumber,
          });

          // Create deployment transaction record
          await createContractTransaction({
            transaction_hash: receipt.transactionHash,
            block_number: Number(receipt.blockNumber),
            block_timestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
            log_index: 0, // Deployment event is first event
            gas_used: Number(receipt.gasUsed),
            gas_price: receipt.effectiveGasPrice ? Number(receipt.effectiveGasPrice) : null,
            contract_address: contract_address.toLowerCase(),
            template_id,
            transaction_type: 'deployment',
            from_address: creator_address.toLowerCase(),
            to_address: null,
            amount: null,
            event_data: {
              creator: creator_address,
              template: template_id,
              config: config,
              basename: basename || null,
            },
            status: 'confirmed',
          });

          console.log('✅ Deployment transaction recorded:', receipt.transactionHash);
        } else {
          console.warn('⚠️ Transaction receipt not found, skipping transaction record');
        }
      } catch (txError: any) {
        // Don't fail the whole request if transaction recording fails
        console.error('⚠️ Failed to record deployment transaction:', txError.message);
        // Still return success for contract creation
      }
    } else {
      console.warn('⚠️ No transaction_hash provided, skipping deployment transaction record');
    }

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
