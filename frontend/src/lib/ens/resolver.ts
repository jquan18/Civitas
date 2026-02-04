import { createPublicClient, http } from 'viem';
import { normalize } from 'viem/ens';
import { mainnet } from 'viem/chains';

/**
 * Resolution result from the server-side API
 */
export interface ENSResolutionResult {
  address: `0x${string}` | null;
  source: 'l1' | 'l2' | 'raw';
  originalInput: string;
  error?: string;
}

/**
 * Check if a string is an ENS name (any supported format)
 */
export function isENSName(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.endsWith('.eth') ||
    lower.endsWith('.base.eth') ||
    lower.endsWith('.basetest.eth')
  );
}

/**
 * Check if a string is a valid Ethereum address
 */
export function isAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Get a human-readable label for the ENS type
 */
export function getENSTypeLabel(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('.basetest.eth')) return 'Base Sepolia Name';
  if (lower.endsWith('.base.eth')) return 'Base Name';
  if (lower.endsWith('.eth')) return 'ENS Name';
  return 'Unknown';
}

/**
 * Resolve ENS name via server-side API (supports L1 and L2)
 * This is the preferred method as it handles both mainnet ENS and Base names
 */
export async function resolveENSServerSide(input: string): Promise<ENSResolutionResult> {
  try {
    const response = await fetch('/api/resolve-ens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: input }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        address: null,
        source: 'raw',
        originalInput: input,
        error: data.error || `Resolution failed with status ${response.status}`,
      };
    }

    return data as ENSResolutionResult;
  } catch (error: any) {
    console.error('ENS resolution request failed:', error);
    return {
      address: null,
      source: 'raw',
      originalInput: input,
      error: error.message || 'Network error during resolution',
    };
  }
}

/**
 * Resolve multiple ENS names/addresses in parallel
 * Returns a map of input -> result
 */
export async function batchResolveENS(
  inputs: string[]
): Promise<Map<string, ENSResolutionResult>> {
  const results = new Map<string, ENSResolutionResult>();

  // Resolve all in parallel
  const promises = inputs.map(async (input) => {
    const result = await resolveENSServerSide(input);
    return { input, result };
  });

  const resolved = await Promise.all(promises);

  for (const { input, result } of resolved) {
    results.set(input, result);
  }

  return results;
}

/**
 * Resolve ENS name to Ethereum address (client-side, mainnet only)
 * @deprecated Use resolveENSServerSide for multi-chain support
 */
export async function resolveENS(name: string): Promise<`0x${string}` | null> {
  if (!isENSName(name)) {
    return null;
  }

  try {
    const publicClient = createPublicClient({
      chain: mainnet,
      transport: http(process.env.NEXT_PUBLIC_MAINNET_RPC_URL),
    });

    const address = await publicClient.getEnsAddress({
      name: normalize(name),
    });

    return address;
  } catch (error) {
    console.error('ENS resolution failed:', error);
    return null;
  }
}

/**
 * Resolve tenant input (ENS name or address) to address
 * Uses server-side resolution for full L1/L2 support
 */
export async function resolveTenant(input: string): Promise<`0x${string}` | null> {
  // If it's already an address, return it
  if (isAddress(input)) {
    return input as `0x${string}`;
  }

  // Use server-side resolution for ENS names
  const result = await resolveENSServerSide(input);
  return result.address;
}

/**
 * Format address for display (truncated)
 */
export function formatAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format resolution result for display
 * e.g., "vitalik.eth → 0xd8dA...6045"
 */
export function formatResolution(result: ENSResolutionResult): string {
  if (!result.address) {
    return `${result.originalInput} → ❌ ${result.error || 'Not found'}`;
  }

  if (result.source === 'raw') {
    return formatAddress(result.address);
  }

  return `${result.originalInput} → ${formatAddress(result.address)}`;
}
