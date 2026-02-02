import { NextRequest, NextResponse } from 'next/server'
import { syncContractFromBlockchain } from '@/lib/supabase/sync'
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'
import { RECURRING_RENT_ABI } from '@/lib/contracts/abis'

const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL),
})

export async function POST(request: NextRequest) {
  try {
    const { contractAddress } = await request.json()

    if (!contractAddress) {
      return NextResponse.json(
        { error: 'Contract address required' },
        { status: 400 }
      )
    }

    // Fetch fresh data from blockchain
    const [landlord, tenant, monthlyAmount, totalMonths, startTimestamp, state, terminationInitiatedAt] =
      await Promise.all([
        publicClient.readContract({
          address: contractAddress,
          abi: RECURRING_RENT_ABI,
          functionName: 'landlord',
        }),
        publicClient.readContract({
          address: contractAddress,
          abi: RECURRING_RENT_ABI,
          functionName: 'tenant',
        }),
        publicClient.readContract({
          address: contractAddress,
          abi: RECURRING_RENT_ABI,
          functionName: 'monthlyAmount',
        }),
        publicClient.readContract({
          address: contractAddress,
          abi: RECURRING_RENT_ABI,
          functionName: 'totalMonths',
        }),
        publicClient.readContract({
          address: contractAddress,
          abi: RECURRING_RENT_ABI,
          functionName: 'startTimestamp',
        }),
        publicClient.readContract({
          address: contractAddress,
          abi: RECURRING_RENT_ABI,
          functionName: 'state',
        }),
        publicClient.readContract({
          address: contractAddress,
          abi: RECURRING_RENT_ABI,
          functionName: 'terminationInitiatedAt',
        }),
      ])

    // Sync to Supabase
    const updated = await syncContractFromBlockchain(contractAddress, {
      landlord,
      tenant,
      monthlyAmount,
      totalMonths,
      startTimestamp,
      state,
      terminationInitiatedAt,
    })

    return NextResponse.json({ contract: updated })
  } catch (error) {
    console.error('Error syncing contract:', error)
    return NextResponse.json(
      { error: 'Failed to sync contract' },
      { status: 500 }
    )
  }
}
