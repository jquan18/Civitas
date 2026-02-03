import { NextRequest, NextResponse } from 'next/server';
import { createContract } from '@/lib/supabase/contracts';
import { createUserContractRelation, getOrCreateUser } from '@/lib/supabase/users';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      contract_address,
      landlord_address,
      tenant_address,
      basename,
      monthly_amount,
      total_months,
      state = 0,
      tenant_ens_name,
    } = body;

    // Validation
    if (!contract_address || !landlord_address || !basename || !monthly_amount || !total_months) {
      return NextResponse.json(
        { error: 'contract_address, landlord_address, monthly_amount, total_months, and basename are required' },
        { status: 400 }
      );
    }

    // Validate contract address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(contract_address)) {
      return NextResponse.json(
        { error: 'Invalid contract_address format. Must be 0x followed by 40 hex characters' },
        { status: 400 }
      );
    }

    // Validate landlord address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(landlord_address)) {
      return NextResponse.json(
        { error: 'Invalid landlord_address format' },
        { status: 400 }
      );
    }

    // Validate tenant address format if provided
    if (tenant_address && !/^0x[a-fA-F0-9]{40}$/.test(tenant_address)) {
      return NextResponse.json(
        { error: 'Invalid tenant_address format' },
        { status: 400 }
      );
    }

    // Validate state
    if (state < 0 || state > 4) {
      return NextResponse.json(
        { error: 'Invalid state value. Must be 0-4' },
        { status: 400 }
      );
    }

    // Validate amounts
    if (monthly_amount <= 0) {
      return NextResponse.json(
        { error: 'monthly_amount must be a positive number' },
        { status: 400 }
      );
    }

    if (total_months < 1 || total_months > 60) {
      return NextResponse.json(
        { error: 'total_months must be between 1 and 60' },
        { status: 400 }
      );
    }

    // 1. Ensure landlord user exists
    await getOrCreateUser(landlord_address);

    // 2. Ensure tenant user exists if address is set
    const zeroAddress = '0x0000000000000000000000000000000000000000';
    if (tenant_address && tenant_address !== zeroAddress) {
      await getOrCreateUser(tenant_address, tenant_ens_name);
    }

    // 3. Create contract record in Supabase
    const contract = await createContract({
      contract_address,
      landlord_address,
      tenant_address: tenant_address && tenant_address !== zeroAddress ? tenant_address : null,
      tenant_ens_name: tenant_ens_name || null,
      basename,
      monthly_amount,
      total_months,
      total_amount: monthly_amount * total_months,
      state,
    });

    // 4. Create user-contract relationships
    await createUserContractRelation(landlord_address, contract_address, 'landlord');

    if (tenant_address && tenant_address !== zeroAddress) {
      await createUserContractRelation(tenant_address, contract_address, 'tenant');
    }

    return NextResponse.json({
      success: true,
      contract,
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error storing contract:', error);

    // Check for duplicate contract error
    if (error.message?.includes('duplicate') || error.code === '23505') {
      return NextResponse.json(
        { error: `Contract with this address already exists` },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to store contract' },
      { status: 500 }
    );
  }
}
