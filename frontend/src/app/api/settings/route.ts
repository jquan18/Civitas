import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// GET /api/settings?user_address=0x...
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userAddress = searchParams.get('user_address');

    if (!userAddress) {
      return NextResponse.json(
        { error: 'user_address parameter is required' },
        { status: 400 }
      );
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

    // Fetch user settings
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_address', userAddress)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Supabase query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch settings' },
        { status: 500 }
      );
    }

    // Return defaults if no settings exist
    if (!data) {
      return NextResponse.json({
        network_mode: 'testnet',
        currency_display: 'USD',
        date_format: 'MM/DD/YYYY',
        address_display: 'truncated',
        rpc_base_url: null,
        rpc_ethereum_url: null,
        notification_preferences: {},
      });
    }

    // Return existing settings
    return NextResponse.json({
      network_mode: data.network_mode,
      currency_display: data.currency_display,
      date_format: data.date_format,
      address_display: data.address_display,
      rpc_base_url: data.rpc_base_url,
      rpc_ethereum_url: data.rpc_ethereum_url,
      notification_preferences: data.notification_preferences,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/settings
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_address, ...updates } = body;

    if (!user_address) {
      return NextResponse.json(
        { error: 'user_address is required' },
        { status: 400 }
      );
    }

    // Validate updates
    const validFields = [
      'network_mode',
      'currency_display',
      'date_format',
      'address_display',
      'rpc_base_url',
      'rpc_ethereum_url',
      'notification_preferences',
    ];

    const filteredUpdates = Object.keys(updates)
      .filter(key => validFields.includes(key))
      .reduce((obj, key) => ({ ...obj, [key]: updates[key] }), {});

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

    // Upsert settings (insert or update)
    const { data, error } = await supabase
      .from('user_settings')
      .upsert({
        user_address,
        ...filteredUpdates,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_address',
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase upsert error:', error);
      return NextResponse.json(
        { error: 'Failed to update settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      settings: {
        network_mode: data.network_mode,
        currency_display: data.currency_display,
        date_format: data.date_format,
        address_display: data.address_display,
        rpc_base_url: data.rpc_base_url,
        rpc_ethereum_url: data.rpc_ethereum_url,
        notification_preferences: data.notification_preferences,
      },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
