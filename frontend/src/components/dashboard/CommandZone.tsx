'use client';

import { GenericContractCard } from './GenericContractCard';
import type { ContractTemplate } from '@/lib/contracts/constants';

interface GenericContract {
  id: string;
  contract_address: string;
  template_id: ContractTemplate;
  creator_address: string;
  chain_id: number;
  state: number;
  basename: string | null;
  config: any;
  on_chain_state: any | null;
  created_at: string | null;
}

type AllContracts = RentalContract | GenericContract;

interface CommandZoneProps {
  rentalContracts: RentalContract[];
  genericContracts: GenericContract[];
  onSelectContract: (contract: AllContracts) => void;
  selectedContract: AllContracts | null;
  loading?: boolean;
}

function isRentalContract(contract: AllContracts): contract is RentalContract {
  return 'monthlyAmount' in contract && 'totalMonths' in contract;
}

export default function CommandZone({
  rentalContracts,
  genericContracts,
  onSelectContract,
  selectedContract,
  loading = false
}: CommandZoneProps) {

  const totalContracts = rentalContracts.length + genericContracts.length;

  return (
    <div className="w-full md:w-[45%] flex flex-col h-full bg-stark-white border-r-4 border-black">
      {/* Header */}
      <div className="p-4 border-b-4 border-black bg-stark-white flex justify-between items-center shrink-0">
        <h2 className="font-headline text-2xl uppercase tracking-tighter">Command Zone</h2>
        <div className="flex gap-2 items-center">
          <span className="text-xs font-display font-bold bg-acid-lime text-void-black px-2 py-1 border-2 border-black shadow-[2px_2px_0px_#000]">
            {totalContracts} CONTRACT{totalContracts !== 1 ? 'S' : ''}
          </span>
          <span className="w-3 h-3 bg-red-500 border-2 border-black"></span>
          <span className="w-3 h-3 bg-warning-yellow border-2 border-black"></span>
          <span className="w-3 h-3 bg-green-500 border-2 border-black"></span>
        </div>
      </div>

      {/* Contract List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIi8+CjxwYXRoIGQ9Ik0wIDBMODg4IiBzdHJva2U9IiNmMmYyZjIiIHN0cm9rZS13aWR0aD0iMSIvPgo8L3N2Zz4=')] bg-cover bg-center bg-blend-overlay bg-white/95">
        {loading ? (
          <div className="text-center my-12">
            <div className="bg-stark-white border-4 border-black shadow-[8px_8px_0px_#000] p-12 inline-block">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-black mx-auto mb-4"></div>
              <p className="font-display font-bold text-black">LOADING CONTRACTS...</p>
            </div>
          </div>
        ) : totalContracts === 0 ? (
          <div className="text-center my-12">
            <div className="bg-stark-white border-4 border-black shadow-[8px_8px_0px_#000] p-12 inline-block">
              <p className="font-display font-bold text-black mb-4">NO CONTRACTS DETECTED</p>
              <a
                href="/create"
                className="inline-block bg-acid-lime border-3 border-black px-6 py-3 font-display font-black uppercase shadow-[4px_4px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000] transition-all mr-2"
              >
                Create Agreement
              </a>
              <a
                href="/test-contract"
                className="inline-block bg-hot-pink border-3 border-black px-6 py-3 font-display font-black uppercase shadow-[4px_4px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000] transition-all"
              >
                Deploy Template
              </a>
            </div>
          </div>
        ) : (
          <>
            <div className="text-center mb-4">
              <span className="bg-acid-lime text-void-black px-3 py-1 text-xs font-display font-bold uppercase border-2 border-black shadow-[2px_2px_0px_#000]">
                --- Connected to Secure Channel #ALPHA ---
              </span>
            </div>

            {/* Contracts Section */}
            {genericContracts.length > 0 && (
              <div>
                <h3 className="font-display font-bold text-xs uppercase tracking-wider text-gray-600 mb-3 px-2">
                  ⚡ Contracts ({genericContracts.length})
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  {genericContracts.map((contract) => (
                    <GenericContractCard
                      key={contract.id}
                      contract={contract}
                      onClick={() => onSelectContract(contract)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

