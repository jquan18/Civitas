#!/usr/bin/env tsx

/**
 * Calculate namehash for civitas.basetest.eth
 * Run from frontend directory: cd frontend && npx tsx ../scripts/calculate-namehash-frontend.ts
 */

import { namehash } from 'viem/ens';

const domain = 'civitas.basetest.eth';
const parentNode = namehash(domain);

console.log('═══════════════════════════════════════════════════════════');
console.log('  ENS Namehash Calculator for Civitas');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('Domain:', domain);
console.log('Parent Node (namehash):', parentNode);

console.log('\n✅ Copy this value to use in your deployment script:');
console.log('\n  bytes32 constant CIVITAS_PARENT_NODE =', parentNode + ';');

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  Update this in:');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('  File: contracts/script/DeployCivitasWithENS.s.sol');
console.log('  Line: 24\n');

// Test subdomain calculation
const testBasename = 'test-contract-a1b2c3d4';
const fullName = `${testBasename}.${domain}`;
const subnameHash = namehash(fullName);

console.log('═══════════════════════════════════════════════════════════');
console.log('  Verification Test:');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('Example subdomain:', fullName);
console.log('Subdomain namehash:', subnameHash);
console.log('\n✅ This should match factory.calculateENSNode("test-contract-a1b2c3d4")');
console.log('\n');
