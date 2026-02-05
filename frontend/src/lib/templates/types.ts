import type { z } from 'zod'

export interface TemplateField {
  key: string
  label: string
  type: 'address' | 'amount' | 'date' | 'state' | 'text' | 'progress' | 'number' | 'boolean' | 'array' | 'addressList' | 'bpsList' | 'duration'
  format?: (value: any) => string
  description?: string
}

export interface TemplateAction {
  id: string
  label: string
  description: string
  functionName: string
  requiresRole?: string[]
  enabledWhen?: (contractData: any) => boolean
}

export interface TemplateDefinition {
  // ============================================
  // Basic Info
  // ============================================
  id: string // 'rent-vault', 'group-buy-escrow', 'stable-allowance-treasury'
  name: string
  contractName?: string // Name of the Solidity contract (e.g., 'RentVault')
  description: string
  category: 'finance' | 'governance' | 'escrow' | 'utility'
  
  // ============================================
  // AI Detection
  // ============================================
  keywords: string[]
  intentPatterns: RegExp[]
  
  // ============================================
  // Schema (Validation & AI Extraction)
  // ============================================
  parameterSchema: z.ZodObject<any>
  
  // ============================================
  // UI Hints
  // ============================================
  dashboardFields: TemplateField[]
  receiptFields?: TemplateField[] // Fields shown in pre-deployment receipt (subset of AI-extracted fields)
  actionButtons: TemplateAction[]
  icon: string // Lucide icon name
  color: string // Neo-Brutalist accent color
  
  // ============================================
  // Roles (for RLS and filtering)
  // ============================================
  roles: string[]
  getUserRole: (userAddress: string, contractData: any) => string[]
}

export type TemplateId = 'rent-vault' | 'group-buy-escrow' | 'stable-allowance-treasury'
