import { NextRequest, NextResponse } from 'next/server';
import { getUserContracts } from '@/lib/supabase/generic-contracts';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    // In Next.js 15, params is a Promise and must be awaited
    const { address } = await params;

    if (!address) {
      return NextResponse.json(
        { error: 'Address parameter is required' },
        { status: 400 }
      );
    }

    // Fetch all contracts created by this user
    const contracts = await getUserContracts(address);

    console.log(`✅ Fetched ${contracts.length} contracts for user ${address}`);

    return NextResponse.json({
      success: true,
      contracts,
      count: contracts.length,
    });
  } catch (error: any) {
    console.error('❌ Failed to fetch user contracts:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch contracts' },
      { status: 500 }
    );
  }
}
