#!/usr/bin/env tsx

// Calculate namehash for civitas.basetest.eth
import { namehash } from 'viem/ens';

// Your registered domain
const domain = 'civitas.basetest.eth';

// Calculate the namehash
const parentNode = namehash(domain);

console.log('═══════════════════════════════════════════════════════');
console.log('  ENS Namehash Calculator for Civitas');
console.log('═══════════════════════════════════════════════════════\n');

console.log('Domain:', domain);
console.log('Parent Node (namehash):', parentNode);
console.log('\n✅ Copy this value to use in factory.setCivitasParentNode()');

console.log('\n═══════════════════════════════════════════════════════');
console.log('  Verification:');
console.log('═══════════════════════════════════════════════════════\n');

// Test subdomain calculation
const testBasename = 'test-contract-a1b2c3d4';
const fullName = `${testBasename}.${domain}`;
const subnameHash = namehash(fullName);

console.log('Example subdomain:', fullName);
console.log('Subdomain namehash:', subnameHash);
console.log('\n✅ This should match factory.calculateENSNode("test-contract-a1b2c3d4")');
