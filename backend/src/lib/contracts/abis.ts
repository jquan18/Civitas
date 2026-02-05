// ─── Legacy ABIs Removed (February 2026) ─────────────────────────────────────
// RENTAL_FACTORY_ABI and RECURRING_RENT_ABI removed - see contracts/archive/

// ─── CivitasFactory ABI ───────────────────────────────────────────────────────

export const CIVITAS_FACTORY_ABI = [
  {
    type: 'function',
    name: 'createRentVault',
    inputs: [
      { name: '_recipient', type: 'address', internalType: 'address' },
      { name: '_rentAmount', type: 'uint256', internalType: 'uint256' },
      { name: '_dueDate', type: 'uint256', internalType: 'uint256' },
      { name: '_tenants', type: 'address[]', internalType: 'address[]' },
      { name: '_shareBps', type: 'uint256[]', internalType: 'uint256[]' },
    ],
    outputs: [{ name: 'clone', type: 'address', internalType: 'address' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'createGroupBuyEscrow',
    inputs: [
      { name: '_recipient', type: 'address', internalType: 'address' },
      { name: '_fundingGoal', type: 'uint256', internalType: 'uint256' },
      { name: '_expiryDate', type: 'uint256', internalType: 'uint256' },
      { name: '_timelockRefundDelay', type: 'uint256', internalType: 'uint256' },
      { name: '_participants', type: 'address[]', internalType: 'address[]' },
      { name: '_shareBps', type: 'uint256[]', internalType: 'uint256[]' },
    ],
    outputs: [{ name: 'clone', type: 'address', internalType: 'address' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'createStableAllowanceTreasury',
    inputs: [
      { name: '_owner', type: 'address', internalType: 'address' },
      { name: '_recipient', type: 'address', internalType: 'address' },
      { name: '_allowancePerIncrement', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [{ name: 'clone', type: 'address', internalType: 'address' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'RentVaultCreated',
    inputs: [
      { name: 'creator', type: 'address', indexed: true, internalType: 'address' },
      { name: 'clone', type: 'address', indexed: true, internalType: 'address' },
      { name: 'recipient', type: 'address', indexed: true, internalType: 'address' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'GroupBuyEscrowCreated',
    inputs: [
      { name: 'creator', type: 'address', indexed: true, internalType: 'address' },
      { name: 'clone', type: 'address', indexed: true, internalType: 'address' },
      { name: 'recipient', type: 'address', indexed: true, internalType: 'address' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'TreasuryCreated',
    inputs: [
      { name: 'creator', type: 'address', indexed: true, internalType: 'address' },
      { name: 'clone', type: 'address', indexed: true, internalType: 'address' },
      { name: 'owner_', type: 'address', indexed: true, internalType: 'address' },
    ],
    anonymous: false,
  },
] as const

// ─── RentVault ABI ────────────────────────────────────────────────────────────

export const RENT_VAULT_ABI = [
  {
    type: 'function',
    name: 'recipient',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'rentAmount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'dueDate',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'totalDeposited',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'withdrawn',
    inputs: [],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'Deposited',
    inputs: [
      { name: 'tenant', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'totalDeposited', type: 'uint256', indexed: false }
    ],
  },
  {
    type: 'event',
    name: 'RentFullyFunded',
    inputs: [{ name: 'totalDeposited', type: 'uint256', indexed: false }],
  },
  {
    type: 'event',
    name: 'WithdrawnToLandlord',
    inputs: [
      { name: 'landlord', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false }
    ],
  },
  {
    type: 'event',
    name: 'Refunded',
    inputs: [
      { name: 'tenant', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false }
    ],
  },
] as const

// ─── GroupBuyEscrow ABI ───────────────────────────────────────────────────────

export const GROUP_BUY_ESCROW_ABI = [
  {
    type: 'function',
    name: 'recipient',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'fundingGoal',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'expiryDate',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'timelockRefundDelay',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'totalDeposited',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'goalReachedAt',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'deliveryConfirmedAt',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'released',
    inputs: [],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'yesVotes',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'participantCount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'Deposited',
    inputs: [
      { name: 'participant', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'totalDeposited', type: 'uint256', indexed: false }
    ],
  },
  {
    type: 'event',
    name: 'GoalReached',
    inputs: [
      { name: 'totalDeposited', type: 'uint256', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false }
    ],
  },
  {
    type: 'event',
    name: 'Refunded',
    inputs: [
      { name: 'participant', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false }
    ],
  },
  {
    type: 'event',
    name: 'DeliveryConfirmed',
    inputs: [
      { name: 'recipient', type: 'address', indexed: true },
      { name: 'proof', type: 'string', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false }
    ],
  },
  {
    type: 'event',
    name: 'VoteCast',
    inputs: [
      { name: 'participant', type: 'address', indexed: true },
      { name: 'yesVotes', type: 'uint256', indexed: false }
    ],
  },
  {
    type: 'event',
    name: 'FundsReleased',
    inputs: [
      { name: 'purchaser', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false }
    ],
  },
  {
    type: 'event',
    name: 'TimelockRefund',
    inputs: [
      { name: 'participant', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false }
    ],
  },
] as const

// ─── StableAllowanceTreasury ABI ──────────────────────────────────────────────

export const STABLE_ALLOWANCE_TREASURY_ABI = [
  {
    type: 'function',
    name: 'owner',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'recipient',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'allowancePerIncrement',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'approvalCounter',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'claimedCount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'state',
    inputs: [],
    outputs: [{ name: '', type: 'uint8', internalType: 'enum StableAllowanceTreasury.State' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'ApprovalIncremented',
    inputs: [
      { name: 'owner', type: 'address', indexed: true },
      { name: 'newApprovalCount', type: 'uint256', indexed: false },
      { name: 'incrementAmount', type: 'uint256', indexed: false }
    ],
  },
  {
    type: 'event',
    name: 'AllowanceClaimed',
    inputs: [
      { name: 'recipient', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'claimNumber', type: 'uint256', indexed: false }
    ],
  },
  {
    type: 'event',
    name: 'Deposited',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'newBalance', type: 'uint256', indexed: false }
    ],
  },
  {
    type: 'event',
    name: 'StateChanged',
    inputs: [
      { name: 'oldState', type: 'uint8', indexed: false },
      { name: 'newState', type: 'uint8', indexed: false }
    ],
  },
  {
    type: 'event',
    name: 'EmergencyWithdrawal',
    inputs: [
      { name: 'to', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false }
    ],
  },
] as const

// ─── ERC20 ABI ────────────────────────────────────────────────────────────────

export const ERC20_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'transfer',
    inputs: [
      { name: 'to', type: 'address', internalType: 'address' },
      { name: 'amount', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address', internalType: 'address' },
      { name: 'amount', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { name: 'owner', type: 'address', internalType: 'address' },
      { name: 'spender', type: 'address', internalType: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'decimals',
    inputs: [],
    outputs: [{ name: '', type: 'uint8', internalType: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'symbol',
    inputs: [],
    outputs: [{ name: '', type: 'string', internalType: 'string' }],
    stateMutability: 'view',
  },
] as const;
