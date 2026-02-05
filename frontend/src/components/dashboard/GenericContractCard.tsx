'use client';

import HardShadowCard from '@/components/ui/HardShadowCard';
import { getTemplateInfo, getContractState } from '@/lib/contracts/template-utils';
import { CONTRACT_TEMPLATES, type ContractTemplate } from '@/lib/contracts/constants';

interface GenericContract {
  id: string;
  contract_address: string;
  template_id: string;
  creator_address: string;
  chain_id: number;
  state: number;
  basename: string | null;
  config: any;
  on_chain_state: any | null;
  created_at: string | null;
  updated_at?: string | null;
  last_synced_at?: string | null;
}

interface GenericContractCardProps {
  contract: GenericContract;
  onClick?: () => void;
}

export function GenericContractCard({ contract, onClick }: GenericContractCardProps) {
  const templateInfo = getTemplateInfo(contract.template_id as ContractTemplate);
  const stateInfo = getContractState(contract.state);

  // Map state to bg colors matching the brutal style
  const stateBgColor = {
    0: 'bg-gray-400', // Deployed
    1: 'bg-acid-lime', // Active
    2: 'bg-green-500', // Completed
    3: 'bg-purple-500', // Terminating
    4: 'bg-red-500', // Terminated
  }[contract.state] || 'bg-gray-400';

  // Extract key info from config based on template
  let primaryInfo = '';
  let secondaryInfo = '';

  try {
    if (contract.template_id === CONTRACT_TEMPLATES.RENT_VAULT) {
      const amount = contract.config.rentAmount ? (parseFloat(contract.config.rentAmount) / 1e6).toFixed(2) : '0';
      const tenants = contract.config.tenants?.length || 0;
      primaryInfo = `${tenants} tenant${tenants !== 1 ? 's' : ''}`;
      secondaryInfo = `${amount} USDC`;
    } else if (contract.template_id === CONTRACT_TEMPLATES.GROUP_BUY_ESCROW) {
      const goal = contract.config.fundingGoal ? (parseFloat(contract.config.fundingGoal) / 1e6).toFixed(2) : '0';
      const participants = contract.config.participants?.length || 0;
      primaryInfo = `${participants} participant${participants !== 1 ? 's' : ''}`;
      secondaryInfo = `Goal: ${goal} USDC`;
    } else if (contract.template_id === CONTRACT_TEMPLATES.STABLE_ALLOWANCE_TREASURY) {
      const allowance = contract.config.allowancePerIncrement ? (parseFloat(contract.config.allowancePerIncrement) / 1e6).toFixed(2) : '0';
      primaryInfo = 'Allowance';
      secondaryInfo = `${allowance} USDC`;
    }
  } catch (e) {
    console.error('Error parsing config:', e);
  }

  return (
    <HardShadowCard hoverable onClick={onClick} className="p-6 cursor-pointer">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{templateInfo.icon}</span>
          <div>
            <h3 className="font-display font-bold text-sm text-black">
              {templateInfo.name}
            </h3>
            <p className="font-display text-xs text-black mt-1">
              {contract.contract_address.slice(0, 10)}...{contract.contract_address.slice(-8)}
            </p>
          </div>
        </div>
        <div className={`${stateBgColor} text-black px-3 py-1 border-2 border-black`}>
          <span className="font-display font-bold text-xs uppercase">{stateInfo.label}</span>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 font-display text-sm border-t-2 border-dashed border-black pt-4">
        {primaryInfo && (
          <div className="flex justify-between">
            <span className="text-black font-bold">Type:</span>
            <span className="text-black">{primaryInfo}</span>
          </div>
        )}
        {secondaryInfo && (
          <div className="flex justify-between">
            <span className="text-black font-bold">Amount:</span>
            <span className="text-black font-bold">{secondaryInfo}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-black font-bold">Chain:</span>
          <span className="text-black text-xs">
            {contract.chain_id === 8453 ? 'Base' : contract.chain_id === 84532 ? 'Base Sepolia' : `Chain ${contract.chain_id}`}
          </span>
        </div>
      </div>
    </HardShadowCard>
  );
}
