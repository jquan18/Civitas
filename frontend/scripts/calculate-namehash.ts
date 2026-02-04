// Calculate namehash for civitas.basetest.eth
import { namehash } from 'viem/ens';

// Your registered domain
const domain = 'civitas.basetest.eth';

// Calculate the namehash
const parentNode = namehash(domain);

console.log('Domain:', domain);
console.log('Parent Node (namehash):', parentNode);

// For convenience, also show the breakdown:
console.log('\nBreakdown:');
console.log('  basetest.eth node:', namehash('basetest.eth'));
console.log('  civitas label hash:', `0x${Buffer.from('civitas').toString('hex')}`);

export const CIVITAS_PARENT_NODE = parentNode;
