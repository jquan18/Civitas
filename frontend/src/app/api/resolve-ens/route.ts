import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, namehash, type Address } from 'viem';
import { normalize } from 'viem/ens';
import { mainnet, sepolia, baseSepolia, base } from 'viem/chains';

// =============================================================================
// Base Sepolia Basename Contract Addresses
// =============================================================================
const BASE_SEPOLIA_CONTRACTS = {
  registry: '0x1493b2567056c2181630115660963E13A8E32735' as Address,
  resolver: '0x6533C94869D28fAA8dF77cc63f9e2b2D6Cf77eBA' as Address,
  reverseRegistrar: '0x1da0c5825229676527582b13735111b1574c8853' as Address,
};

// Base Mainnet Basename Contract Addresses
const BASE_MAINNET_CONTRACTS = {
  registry: '0x1493b2567056c2181630115660963E13A8E32735' as Address,
  resolver: '0xC6d566A56A1aFf6508b41f6c90ff131615583BCD' as Address,
  reverseRegistrar: '0x79EA96012eEa67A83431F1701B3dFf7e37F9E282' as Address,
};

// L1 ENS Registry
const L1_ENS_REGISTRY = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e' as Address;

// RPC URLs
const RPC_URLS = {
  [mainnet.id]: process.env.NEXT_PUBLIC_MAINNET_RPC_URL || 'https://eth.llamarpc.com',
  [sepolia.id]: process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
  [baseSepolia.id]: process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
  [base.id]: process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org',
};

// =============================================================================
// ABI for L2 Resolver addr() function
// =============================================================================
const L2_RESOLVER_ABI = [
  {
    name: 'addr',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

type ResolutionSource = 'l1' | 'l2' | 'raw';

interface ResolveResult {
  address: `0x${string}` | null;
  source: ResolutionSource;
  originalInput: string;
  error?: string;
  debug?: {
    normalizedName?: string;
    namehashValue?: string;
    chain?: string;
    resolver?: string;
  };
}

/**
 * Check if input is a valid Ethereum address
 */
function isValidAddress(input: string): input is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(input);
}

/**
 * Detect ENS name type based on suffix
 */
function getENSType(name: string): {
  type: 'l1' | 'l2' | 'unknown';
  chain: typeof mainnet | typeof sepolia | typeof baseSepolia | typeof base;
  isTestnet: boolean;
} {
  const lowerName = name.toLowerCase();

  // L2 Base names (testnet) - .basetest.eth
  if (lowerName.endsWith('.basetest.eth')) {
    return { type: 'l2', chain: baseSepolia, isTestnet: true };
  }

  // L2 Base names (mainnet) - .base.eth
  if (lowerName.endsWith('.base.eth')) {
    return { type: 'l2', chain: base, isTestnet: false };
  }

  // L1 ENS names (.eth but not .base.eth or .basetest.eth)
  if (lowerName.endsWith('.eth')) {
    const isTestnet = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_USE_TESTNET === 'true';
    return { type: 'l1', chain: isTestnet ? sepolia : mainnet, isTestnet };
  }

  return { type: 'unknown', chain: mainnet, isTestnet: false };
}

/**
 * Resolve L1 ENS name (mainnet or sepolia)
 */
async function resolveL1ENS(name: string, chain: typeof mainnet | typeof sepolia): Promise<`0x${string}` | null> {
  try {
    const client = createPublicClient({
      chain,
      transport: http(RPC_URLS[chain.id]),
    });

    const address = await client.getEnsAddress({
      name: normalize(name),
    });

    return address;
  } catch (error) {
    console.error(`L1 ENS resolution failed for ${name}:`, error);
    return null;
  }
}

/**
 * Resolve L2 Basename via direct resolver contract call
 * This is required because Basenames use a different resolution mechanism than L1 ENS
 */
async function resolveL2Basename(
  name: string,
  chain: typeof baseSepolia | typeof base
): Promise<{ address: `0x${string}` | null; debug: ResolveResult['debug'] }> {
  const contracts = chain.id === baseSepolia.id ? BASE_SEPOLIA_CONTRACTS : BASE_MAINNET_CONTRACTS;

  try {
    // Step 1: Normalize the name
    const normalizedName = normalize(name);

    // Step 2: Compute namehash
    const node = namehash(normalizedName);

    console.log(`[L2 Resolution] Name: ${name}`);
    console.log(`[L2 Resolution] Normalized: ${normalizedName}`);
    console.log(`[L2 Resolution] Namehash: ${node}`);
    console.log(`[L2 Resolution] Resolver: ${contracts.resolver}`);
    console.log(`[L2 Resolution] Chain: ${chain.name} (${chain.id})`);

    // Step 3: Create client for the L2 chain
    const client = createPublicClient({
      chain,
      transport: http(RPC_URLS[chain.id]),
    });

    // Step 4: Call the resolver's addr() function directly
    const address = await client.readContract({
      address: contracts.resolver,
      abi: L2_RESOLVER_ABI,
      functionName: 'addr',
      args: [node],
    });

    console.log(`[L2 Resolution] Resolved address: ${address}`);

    // Check if address is zero address (not set)
    if (!address || address === '0x0000000000000000000000000000000000000000') {
      return {
        address: null,
        debug: {
          normalizedName,
          namehashValue: node,
          chain: chain.name,
          resolver: contracts.resolver,
        }
      };
    }

    return {
      address: address as `0x${string}`,
      debug: {
        normalizedName,
        namehashValue: node,
        chain: chain.name,
        resolver: contracts.resolver,
      }
    };
  } catch (error: any) {
    console.error(`L2 Basename resolution failed for ${name}:`, error);
    return {
      address: null,
      debug: {
        chain: chain.name,
        resolver: contracts.resolver,
      }
    };
  }
}

/**
 * POST /api/resolve-ens
 *
 * Resolves an ENS name or validates an address
 *
 * Request body: { name: string }
 * Response: { address, source, originalInput, error?, debug? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, includeDebug } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "name" parameter' },
        { status: 400 }
      );
    }

    const trimmedInput = name.trim();

    // If it's already a valid address, return it directly
    if (isValidAddress(trimmedInput)) {
      const result: ResolveResult = {
        address: trimmedInput,
        source: 'raw',
        originalInput: trimmedInput,
      };
      return NextResponse.json(result);
    }

    // Detect ENS type
    const { type, chain, isTestnet } = getENSType(trimmedInput);

    if (type === 'unknown') {
      const result: ResolveResult = {
        address: null,
        source: 'raw',
        originalInput: trimmedInput,
        error: 'Invalid format. Enter a valid address (0x...) or ENS name (.eth, .base.eth, .basetest.eth)',
      };
      return NextResponse.json(result, { status: 400 });
    }

    // Resolve based on type
    let address: `0x${string}` | null = null;
    let debug: ResolveResult['debug'] = undefined;
    const source: ResolutionSource = type;

    if (type === 'l1') {
      address = await resolveL1ENS(trimmedInput, chain as typeof mainnet | typeof sepolia);
    } else if (type === 'l2') {
      const l2Result = await resolveL2Basename(trimmedInput, chain as typeof baseSepolia | typeof base);
      address = l2Result.address;
      debug = l2Result.debug;
    }

    if (!address) {
      const result: ResolveResult = {
        address: null,
        source,
        originalInput: trimmedInput,
        error: `Could not resolve "${trimmedInput}". The name may not exist or may not have an address record set.`,
        ...(includeDebug && debug ? { debug } : {}),
      };
      return NextResponse.json(result, { status: 404 });
    }

    const result: ResolveResult = {
      address,
      source,
      originalInput: trimmedInput,
      ...(includeDebug && debug ? { debug } : {}),
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('ENS resolution error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/resolve-ens?name=vitalik.eth
 *
 * Alternative GET endpoint for convenience
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');
  const includeDebug = searchParams.get('debug') === 'true';

  if (!name) {
    return NextResponse.json(
      { error: 'Missing "name" query parameter' },
      { status: 400 }
    );
  }

  // Reuse POST logic
  const fakeRequest = {
    json: async () => ({ name, includeDebug }),
  } as NextRequest;

  return POST(fakeRequest);
}
