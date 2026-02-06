import { createPublicClient, http } from 'viem'
import { base, baseSepolia } from 'viem/chains'
import { CIVITAS_FACTORY_ADDRESS } from '@/lib/contracts/constants'
import { CIVITAS_FACTORY_ABI } from '@/lib/contracts/abis'

export const runtime = 'edge'

export async function POST(req: Request) {
  try {
    const { basename, chainId } = await req.json() as {
      basename: string
      chainId: number
    }

    // Validate input
    if (!basename || typeof basename !== 'string') {
      return Response.json(
        { error: 'Invalid basename' },
        { status: 400 }
      )
    }

    // Get chain config
    const chain = chainId === base.id ? base : baseSepolia
    const factoryAddress = CIVITAS_FACTORY_ADDRESS[chainId as keyof typeof CIVITAS_FACTORY_ADDRESS]

    if (!factoryAddress) {
      return Response.json(
        { error: 'Unsupported chain' },
        { status: 400 }
      )
    }

    // Create public client
    const client = createPublicClient({
      chain,
      transport: http(),
    })

    // Check availability via factory contract
    const isAvailable = await client.readContract({
      address: factoryAddress,
      abi: CIVITAS_FACTORY_ABI,
      functionName: 'isBasenameAvailable',
      args: [basename],
    }) as boolean

    // Generate suggestion if taken
    let suggestion = null
    if (!isAvailable) {
      // Simple suggestion: append random suffix
      const suffix = Math.floor(Math.random() * 999)
      suggestion = `${basename}-${suffix}`
    }

    return Response.json({
      available: isAvailable,
      basename,
      suggestion,
    })
  } catch (error) {
    console.error('Basename availability check error:', error)
    return Response.json(
      { error: 'Failed to check availability' },
      { status: 500 }
    )
  }
}
