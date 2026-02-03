import { NextRequest, NextResponse } from 'next/server';
import { getContractByAddress } from '@/lib/supabase/contracts';

export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const contractAddress = params.address;

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
      return NextResponse.json(
        { error: 'Invalid contract address format' },
        { status: 400 }
      );
    }

    // Fetch contract from database
    const contract = await getContractByAddress(contractAddress);

    if (!contract) {
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      contract,
    });

  } catch (error) {
    console.error('Error fetching contract:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contract' },
      { status: 500 }
    );
  }
}
