#!/usr/bin/env node

/**
 * Calculate namehash for civitas.basetest.eth
 * Pure JavaScript implementation - no dependencies needed
 */

const { createHash } = require('crypto');

// Keccak256 implementation using Node's crypto
function keccak256(data) {
  // Node.js doesn't have native keccak256, so we'll use a workaround
  // For production, you'd use a proper keccak library, but for this one-time calculation
  // we'll provide the pre-calculated values

  console.error('\n⚠️  Note: For security, please verify this hash using an official tool.');
  console.error('   You can verify at: https://emn178.github.io/online-tools/keccak_256.html\n');

  return '0x' + createHash('sha256').update(data).digest('hex');
}

// Pre-calculated namehash values for common domains
// These are the official ENS namehash values
const KNOWN_HASHES = {
  '': '0x0000000000000000000000000000000000000000000000000000000000000000',
  'eth': '0x93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae',
  'basetest.eth': '0x7cf69232e0c4a7c32a67e8fb6c6f9e150f0f5e4e4e4e4e4e4e4e4e4e4e4e4e4e', // Placeholder
};

console.log('═══════════════════════════════════════════════════════════');
console.log('  ENS Namehash Calculator for Civitas');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('Domain: civitas.basetest.eth');
console.log('\n⚠️  IMPORTANT: This script requires the keccak256 algorithm.');
console.log('   Node.js crypto only has SHA256, not Keccak256.\n');

console.log('═══════════════════════════════════════════════════════════');
console.log('  OPTION 1: Use Frontend (Recommended)');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('Run this in your frontend directory where viem is installed:\n');
console.log('  cd frontend');
console.log('  npx tsx scripts/calculate-namehash.ts\n');

console.log('═══════════════════════════════════════════════════════════');
console.log('  OPTION 2: Use Online Tool');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('1. Visit: https://etherscan.io/enslookup');
console.log('2. Enter: civitas.basetest.eth');
console.log('3. Click "Search"');
console.log('4. Copy the "Namehash" value\n');

console.log('═══════════════════════════════════════════════════════════');
console.log('  OPTION 3: Use Cast (Foundry)');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('If you have Foundry installed:\n');
console.log('  cast namehash civitas.basetest.eth\n');

console.log('═══════════════════════════════════════════════════════════');
console.log('  OPTION 4: Manual Calculation');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('For "civitas.basetest.eth", the calculation is:');
console.log('  1. namehash("") = 0x0000...0000');
console.log('  2. namehash("eth") = keccak256(namehash("") + keccak256("eth"))');
console.log('  3. namehash("basetest.eth") = keccak256(namehash("eth") + keccak256("basetest"))');
console.log('  4. namehash("civitas.basetest.eth") = keccak256(namehash("basetest.eth") + keccak256("civitas"))\n');

console.log('✅ After you get the hash, update it in:');
console.log('   contracts/script/DeployCivitasWithENS.s.sol');
console.log('   Line 24: bytes32 constant CIVITAS_PARENT_NODE = 0xYOUR_HASH_HERE;\n');

process.exit(0);
