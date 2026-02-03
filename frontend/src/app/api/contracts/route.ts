import { NextRequest, NextResponse } from 'next/server';
import { getUserContracts } from '@/lib/supabase/contracts';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userAddress = searchParams.get('user_address');
    const state = searchParams.get('state');
    const role = searchParams.get('role');

    if (!userAddress) {
      return NextResponse.json(
        { error: 'user_address query parameter is required' },
        { status: 400 }
      );
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    // Fetch contracts from database
    let contracts = await getUserContracts(userAddress);

    // Filter by state if provided
    if (state !== null && state !== 'all') {
      const stateNum = parseInt(state);
      if (!isNaN(stateNum) && stateNum >= 0 && stateNum <= 4) {
        contracts = contracts.filter(c => c.state === stateNum);
      }
    }

    // Filter by role if provided
    if (role && (role === 'landlord' || role === 'tenant')) {
      contracts = contracts.filter(c => {
        if (role === 'landlord') {
          return c.landlord_address.toLowerCase() === userAddress.toLowerCase();
        } else {
          return c.tenant_address?.toLowerCase() === userAddress.toLowerCase();
        }
      });
    }

    // Add role information to each contract
    const contractsWithRole = contracts.map(contract => ({
      ...contract,
      role: contract.landlord_address.toLowerCase() === userAddress.toLowerCase()
        ? 'landlord'
        : 'tenant',
    }));

    return NextResponse.json({
      contracts: contractsWithRole,
      total: contractsWithRole.length,
    });

  } catch (error) {
    console.error('Error fetching contracts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contracts' },
      { status: 500 }
    );
  }
}
