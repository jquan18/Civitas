import { 
  RentVaultConfigSchema,
  GroupBuyEscrowConfigSchema,
  StableAllowanceTreasuryConfigSchema,
} from '@/lib/ai/schemas'
import type { TemplateDefinition } from './types'
import { formatUnits } from 'viem'

// ============================================
// Rent Vault Template
// ============================================
const RentVaultTemplate: TemplateDefinition = {
  id: 'rent-vault',
  name: 'Rent Vault',
  contractName: 'RentVault',
  description: 'Multi-tenant rent collection with share-based contributions. Perfect for roommates splitting rent.',
  category: 'finance',
  
  keywords: ['rent', 'tenant', 'roommate', 'apartment', 'property', 'share', 'split', 'landlord', 'lease'],
  intentPatterns: [
    /rent.*(?:apartment|house|property)/i,
    /split.*rent/i,
    /(?:tenant|roommate).*(?:pay|rent|share)/i,
    /share.*rent/i,
    /landlord.*tenant/i,
  ],
  
  parameterSchema: RentVaultConfigSchema,

  receiptFields: [
    {
      key: 'recipient',
      label: 'Landlord',
      type: 'address',
    },
    {
      key: 'rentAmount',
      label: 'Total Rent',
      type: 'amount',
    },
    {
      key: 'dueDate',
      label: 'Due Date',
      type: 'date',
    },
    {
      key: 'tenants',
      label: 'Tenants',
      type: 'addressList',
    },
    {
      key: 'shareBps',
      label: 'Share %',
      type: 'bpsList',
    },
  ],

  dashboardFields: [
    {
      key: 'recipient',
      label: 'Landlord',
      type: 'address',
    },
    {
      key: 'rentAmount',
      label: 'Total Rent',
      type: 'amount',
    },
    {
      key: 'totalDeposited',
      label: 'Deposited',
      type: 'amount',
    },
    {
      key: 'dueDate',
      label: 'Due Date',
      type: 'date',
    },
    {
      key: 'withdrawn',
      label: 'Status',
      type: 'state',
      format: (value) => value ? 'Withdrawn ✅' : 'Pending 🟡',
    },
  ],
  
  actionButtons: [
    {
      id: 'deposit',
      label: 'Deposit Share',
      description: 'Deposit your share of rent',
      functionName: 'deposit',
      requiresRole: ['tenant'],
      enabledWhen: (data) => !data.withdrawn && data.totalDeposited < data.rentAmount,
    },
    {
      id: 'withdraw',
      label: 'Withdraw to Landlord',
      description: 'Withdraw fully funded rent',
      functionName: 'withdrawToRecipient',
      requiresRole: ['recipient'],
      enabledWhen: (data) => !data.withdrawn && data.totalDeposited === data.rentAmount,
    },
    {
      id: 'refund-all',
      label: 'Refund All Tenants',
      description: 'Refund all deposits if not fully funded',
      functionName: 'refundAll',
      requiresRole: ['recipient'],
      enabledWhen: (data) => !data.withdrawn && data.totalDeposited < data.rentAmount,
    },
  ],
  
  icon: 'Home',
  color: '#CCFF00', // Acid Lime
  
  roles: ['recipient', 'tenant'],
  getUserRole: (userAddress: string, contractData: any) => {
    const roles: string[] = []
    if (contractData.recipient?.toLowerCase() === userAddress.toLowerCase()) {
      roles.push('recipient')
    }
    if (contractData.tenants?.some((t: any) => 
      t.address?.toLowerCase() === userAddress.toLowerCase()
    )) {
      roles.push('tenant')
    }
    return roles
  },
}

// ============================================
// Group Buy Escrow Template
// ============================================
const GroupBuyEscrowTemplate: TemplateDefinition = {
  id: 'group-buy-escrow',
  name: 'Group Buy Escrow',
  contractName: 'GroupBuyEscrow',
  description: 'Group purchase with majority vote release. Pool funds for a shared purchase with delivery confirmation.',
  category: 'escrow',
  
  keywords: ['group', 'buy', 'purchase', 'escrow', 'crowdfund', 'pool', 'collective', 'split', 'vote'],
  intentPatterns: [
    /group.*(?:buy|purchase)/i,
    /(?:crowdfund|pool).*(?:money|funds)/i,
    /collective.*purchase/i,
    /split.*(?:cost|purchase)/i,
    /escrow.*group/i,
  ],
  
  parameterSchema: GroupBuyEscrowConfigSchema,

  receiptFields: [
    {
      key: 'recipient',
      label: 'Seller',
      type: 'address',
    },
    {
      key: 'fundingGoal',
      label: 'Funding Goal',
      type: 'amount',
    },
    {
      key: 'expiryDate',
      label: 'Expiry',
      type: 'date',
    },
    {
      key: 'timelockRefundDelay',
      label: 'Refund Delay',
      type: 'duration',
    },
    {
      key: 'participants',
      label: 'Participants',
      type: 'addressList',
    },
    {
      key: 'shareBps',
      label: 'Share %',
      type: 'bpsList',
    },
  ],

  dashboardFields: [
    {
      key: 'recipient',
      label: 'Seller',
      type: 'address',
    },
    {
      key: 'fundingGoal',
      label: 'Funding Goal',
      type: 'amount',
    },
    {
      key: 'totalDeposited',
      label: 'Raised',
      type: 'amount',
    },
    {
      key: 'expiryDate',
      label: 'Expiry',
      type: 'date',
    },
    {
      key: 'released',
      label: 'Status',
      type: 'state',
      format: (value) => value ? 'Released ✅' : 'Pending 🟡',
    },
    {
      key: 'yesVotes',
      label: 'Votes',
      type: 'number',
    },
  ],
  
  actionButtons: [
    {
      id: 'deposit',
      label: 'Deposit',
      description: 'Deposit your share',
      functionName: 'deposit',
      requiresRole: ['participant'],
      enabledWhen: (data) => 
        data.totalDeposited < data.fundingGoal && 
        Date.now() / 1000 < data.expiryDate,
    },
    {
      id: 'confirm-delivery',
      label: 'Confirm Delivery',
      description: 'Confirm item received',
      functionName: 'confirmDelivery',
      requiresRole: ['recipient'],
      enabledWhen: (data) => 
        data.goalReachedAt > 0 && 
        data.deliveryConfirmedAt === 0,
    },
    {
      id: 'vote-release',
      label: 'Vote to Release',
      description: 'Vote to release funds to seller',
      functionName: 'voteRelease',
      requiresRole: ['participant'],
      enabledWhen: (data) => 
        data.deliveryConfirmedAt > 0 && 
        !data.released,
    },
    {
      id: 'release-funds',
      label: 'Release Funds',
      description: 'Release funds after majority vote',
      functionName: 'releaseFunds',
      enabledWhen: (data) => 
        data.deliveryConfirmedAt > 0 && 
        !data.released &&
        data.yesVotes * 2 > data.participantCount,
    },
    {
      id: 'refund',
      label: 'Refund',
      description: 'Get refund if expired or timelock reached',
      functionName: 'refund',
      requiresRole: ['participant'],
      enabledWhen: (data) => 
        (data.totalDeposited < data.fundingGoal && Date.now() / 1000 > data.expiryDate) ||
        (data.goalReachedAt > 0 && data.deliveryConfirmedAt === 0),
    },
  ],
  
  icon: 'Users',
  color: '#FF00FF', // Hot Pink
  
  roles: ['recipient', 'participant'],
  getUserRole: (userAddress: string, contractData: any) => {
    const roles: string[] = []
    if (contractData.recipient?.toLowerCase() === userAddress.toLowerCase()) {
      roles.push('recipient')
    }
    if (contractData.participants?.some((p: any) => 
      p.address?.toLowerCase() === userAddress.toLowerCase()
    )) {
      roles.push('participant')
    }
    return roles
  },
}

// ============================================
// Stable Allowance Treasury Template
// ============================================
const StableAllowanceTreasuryTemplate: TemplateDefinition = {
  id: 'stable-allowance-treasury',
  name: 'Stable Allowance Treasury',
  description: 'Counter-based allowance payments. Owner approves increments; recipient claims fixed amounts.',
  category: 'finance',
  
  keywords: ['allowance', 'treasury', 'stipend', 'periodic', 'payment', 'counter', 'increment', 'claim'],
  intentPatterns: [
    /allowance.*(?:monthly|weekly|periodic)/i,
    /stipend.*payment/i,
    /periodic.*payment/i,
    /(?:parent|owner).*allowance/i,
    /treasury.*claim/i,
  ],
  
  parameterSchema: StableAllowanceTreasuryConfigSchema,

  receiptFields: [
    {
      key: 'owner',
      label: 'Owner',
      type: 'address',
    },
    {
      key: 'recipient',
      label: 'Recipient',
      type: 'address',
    },
    {
      key: 'allowancePerIncrement',
      label: 'Amount per Claim',
      type: 'amount',
    },
  ],

  dashboardFields: [
    {
      key: 'owner',
      label: 'Owner',
      type: 'address',
    },
    {
      key: 'recipient',
      label: 'Recipient',
      type: 'address',
    },
    {
      key: 'allowancePerIncrement',
      label: 'Amount per Claim',
      type: 'amount',
    },
    {
      key: 'approvalCounter',
      label: 'Approved',
      type: 'number',
    },
    {
      key: 'claimedCount',
      label: 'Claimed',
      type: 'number',
    },
    {
      key: 'state',
      label: 'Status',
      type: 'state',
      format: (value) => {
        const states = ['Active 🟢', 'Paused 🟡', 'Terminated 🔴']
        return states[value] || 'Unknown'
      },
    },
  ],
  
  actionButtons: [
    {
      id: 'deposit',
      label: 'Deposit Funds',
      description: 'Add USDC to treasury',
      functionName: 'deposit',
    },
    {
      id: 'increment-counter',
      label: 'Approve Increment',
      description: 'Increase approval counter',
      functionName: 'incrementCounter',
      requiresRole: ['owner'],
      enabledWhen: (data) => data.state === 0, // Active
    },
    {
      id: 'claim',
      label: 'Claim Allowance',
      description: 'Claim approved allowance',
      functionName: 'claim',
      requiresRole: ['recipient'],
      enabledWhen: (data) => 
        data.state === 0 && 
        data.claimedCount < data.approvalCounter,
    },
    {
      id: 'pause',
      label: 'Pause',
      description: 'Pause treasury operations',
      functionName: 'pause',
      requiresRole: ['owner'],
      enabledWhen: (data) => data.state === 0,
    },
    {
      id: 'unpause',
      label: 'Unpause',
      description: 'Resume treasury operations',
      functionName: 'unpause',
      requiresRole: ['owner'],
      enabledWhen: (data) => data.state === 1, // Paused
    },
    {
      id: 'terminate',
      label: 'Terminate',
      description: 'Terminate treasury and withdraw',
      functionName: 'terminate',
      requiresRole: ['owner'],
    },
  ],
  
  icon: 'Wallet',
  color: '#FFD600', // Warning Yellow
  
  roles: ['owner', 'recipient'],
  getUserRole: (userAddress: string, contractData: any) => {
    const roles: string[] = []
    if (contractData.owner?.toLowerCase() === userAddress.toLowerCase()) {
      roles.push('owner')
    }
    if (contractData.recipient?.toLowerCase() === userAddress.toLowerCase()) {
      roles.push('recipient')
    }
    return roles
  },
}

// ============================================
// Template Registry
// ============================================
class TemplateRegistry {
  private templates: Map<string, TemplateDefinition>

  constructor() {
    this.templates = new Map()
    this.register(RentVaultTemplate)
    this.register(GroupBuyEscrowTemplate)
    this.register(StableAllowanceTreasuryTemplate)
  }

  /**
   * Register a new template
   */
  register(template: TemplateDefinition) {
    this.templates.set(template.id, template)
  }

  /**
   * Get template by ID
   */
  get(id: string): TemplateDefinition | undefined {
    return this.templates.get(id)
  }

  /**
   * Get all registered templates
   */
  getAll(): TemplateDefinition[] {
    return Array.from(this.templates.values())
  }

  /**
   * Detect template from user's message
   */
  detectFromIntent(userMessage: string): TemplateDefinition | null {
    // Safety check
    if (!userMessage || typeof userMessage !== 'string') {
      return null;
    }
    
    const message = userMessage.toLowerCase()

    // Check each template's patterns
    for (const template of this.templates.values()) {
      // Check keywords
      const hasKeyword = template.keywords.some((keyword) =>
        message.includes(keyword.toLowerCase())
      )

      // Check regex patterns
      const matchesPattern = template.intentPatterns.some((pattern) =>
        pattern.test(userMessage)
      )

      if (hasKeyword || matchesPattern) {
        return template
      }
    }

    return null
  }

  /**
   * Get templates by category
   */
  getByCategory(category: string): TemplateDefinition[] {
    return Array.from(this.templates.values()).filter(
      (t) => t.category === category
    )
  }

  /**
   * Search templates by keyword
   */
  search(query: string): TemplateDefinition[] {
    const lowerQuery = query.toLowerCase()
    return Array.from(this.templates.values()).filter(
      (t) =>
        t.name.toLowerCase().includes(lowerQuery) ||
        t.description.toLowerCase().includes(lowerQuery) ||
        t.keywords.some((k) => k.toLowerCase().includes(lowerQuery))
    )
  }
}

// Export singleton instance
export const templateRegistry = new TemplateRegistry()

// Export individual templates for direct access
export { RentVaultTemplate, GroupBuyEscrowTemplate, StableAllowanceTreasuryTemplate }
