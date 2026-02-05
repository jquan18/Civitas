'use client';

import { useState } from 'react';
import { useAccount, useConnect, useDisconnect, useChainId } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { parseUnits } from 'viem';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCivitasContractDeploy, type RentVaultParams, type GroupBuyEscrowParams, type StableAllowanceTreasuryParams } from '@/hooks/useCivitasContractDeploy';
import { CONTRACT_TEMPLATES, type ContractTemplate, getExplorerTxUrl, getExplorerAddressUrl, CHAIN_CONFIG } from '@/lib/contracts/constants';
import { useNetworkMode } from '@/contexts/NetworkModeContext';

export default function TestContractPage() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const router = useRouter();
  const chainId = useChainId();
  const { networkMode } = useNetworkMode();
  const { deployContract, isDeploying, isSuccess, deploymentHash, deployedAddress, error } = useCivitasContractDeploy();

  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);

  // Get chain name for display
  const chainConfig = CHAIN_CONFIG[chainId as keyof typeof CHAIN_CONFIG];
  const chainName = chainConfig?.name || `Chain ${chainId}`;

  // Wallet connection
  const handleConnect = () => {
    connect({ connector: injected() });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Contract Deployment Test
          </h1>
          <p className="text-lg text-gray-600">
            Deploy and test Civitas smart contract templates on {chainName}
          </p>
        </div>

        {/* Wallet Connection */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">1. Connect Wallet</h2>
          {!isConnected ? (
            <button
              onClick={handleConnect}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition"
            >
              Connect Wallet
            </button>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Connected Address</p>
                <p className="font-mono text-sm">{address}</p>
              </div>
              <button
                onClick={() => disconnect()}
                className="bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>

        {/* Template Selection */}
        {isConnected && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">2. Choose Contract Template</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <TemplateCard
                title="Rent Vault"
                description="Split rent payments among multiple tenants"
                features={[
                  'Multi-tenant support',
                  'Basis point shares',
                  'Due date tracking',
                  'Full refund capability'
                ]}
                isSelected={selectedTemplate === CONTRACT_TEMPLATES.RENT_VAULT}
                onSelect={() => setSelectedTemplate(CONTRACT_TEMPLATES.RENT_VAULT)}
              />
              <TemplateCard
                title="Group Buy Escrow"
                description="Crowdfund purchases with majority voting"
                features={[
                  'Funding goal tracking',
                  'Expiry date protection',
                  'Delivery confirmation',
                  'Majority vote release'
                ]}
                isSelected={selectedTemplate === CONTRACT_TEMPLATES.GROUP_BUY_ESCROW}
                onSelect={() => setSelectedTemplate(CONTRACT_TEMPLATES.GROUP_BUY_ESCROW)}
              />
              <TemplateCard
                title="Allowance Treasury"
                description="Controlled periodic fund releases"
                features={[
                  'Counter-based releases',
                  'Owner approval system',
                  'Pausable functionality',
                  'Emergency withdrawal'
                ]}
                isSelected={selectedTemplate === CONTRACT_TEMPLATES.STABLE_ALLOWANCE_TREASURY}
                onSelect={() => setSelectedTemplate(CONTRACT_TEMPLATES.STABLE_ALLOWANCE_TREASURY)}
              />
            </div>
          </div>
        )}

        {/* Deployment Form */}
        {isConnected && selectedTemplate && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">3. Configure & Deploy</h2>
            {selectedTemplate === CONTRACT_TEMPLATES.RENT_VAULT && (
              <RentVaultForm onDeploy={deployContract} isDeploying={isDeploying} />
            )}
            {selectedTemplate === CONTRACT_TEMPLATES.GROUP_BUY_ESCROW && (
              <GroupBuyEscrowForm onDeploy={deployContract} isDeploying={isDeploying} />
            )}
            {selectedTemplate === CONTRACT_TEMPLATES.STABLE_ALLOWANCE_TREASURY && (
              <StableAllowanceTreasuryForm onDeploy={deployContract} isDeploying={isDeploying} />
            )}
          </div>
        )}

        {/* Deployment Status */}
        {(isDeploying || isSuccess || error || deployedAddress) && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Deployment Status</h2>
            {isDeploying && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-blue-600">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span>
                    {deploymentHash ? 'Confirming transaction...' : 'Waiting for wallet confirmation...'}
                  </span>
                </div>
                {deploymentHash && (
                  <div className="text-sm">
                    <p className="text-gray-600 mb-1">Transaction Hash:</p>
                    <a
                      href={getExplorerTxUrl(chainId, deploymentHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs text-blue-600 hover:underline break-all"
                    >
                      {deploymentHash}
                    </a>
                    <p className="text-xs text-gray-500 mt-2">
                      ⏱️ Taking too long? Check the transaction status on the explorer (link above)
                    </p>
                  </div>
                )}
              </div>
            )}
            {isSuccess && deployedAddress && (
              <div className="text-green-600">
                <p className="font-semibold mb-4">✅ Contract deployed successfully!</p>

                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-700">Contract Address:</p>
                  <a
                    href={getExplorerAddressUrl(chainId, deployedAddress)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-blue-600 hover:underline break-all"
                  >
                    {deployedAddress}
                  </a>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700">Transaction Hash:</p>
                  <a
                    href={getExplorerTxUrl(chainId, deploymentHash || '')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-blue-600 hover:underline break-all"
                  >
                    {deploymentHash}
                  </a>
                </div>

                <div className="flex gap-3 mt-6">
                  <Link
                    href="/my-contracts"
                    className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition text-center"
                  >
                    📋 View in My Contracts
                  </Link>
                  <a
                    href={getExplorerAddressUrl(chainId, deployedAddress)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-300 transition text-center"
                  >
                    🔍 View on Explorer
                  </a>
                </div>
              </div>
            )}
            {error && (
              <div className="text-red-600">
                <p className="font-semibold mb-2">❌ Deployment failed</p>
                <p className="text-sm">{error.message}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Template Card Component
function TemplateCard({
  title,
  description,
  features,
  isSelected,
  onSelect,
}: {
  title: string;
  description: string;
  features: string[];
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`text-left p-6 rounded-lg border-2 transition ${
        isSelected
          ? 'border-blue-600 bg-blue-50'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-4">{description}</p>
      <ul className="space-y-1">
        {features.map((feature, i) => (
          <li key={i} className="text-xs text-gray-500 flex items-start gap-1">
            <span className="text-blue-600">•</span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </button>
  );
}

// RentVault Form
function RentVaultForm({
  onDeploy,
  isDeploying,
}: {
  onDeploy: (template: ContractTemplate, params: RentVaultParams) => Promise<void>;
  isDeploying: boolean;
}) {
  const { address } = useAccount();
  const [recipient, setRecipient] = useState(address || '');
  const [rentAmount, setRentAmount] = useState('1000');

  // Set default due date to 30 days from now
  const getDefaultDueDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().slice(0, 16); // Format for datetime-local input
  };

  const [dueDate, setDueDate] = useState(getDefaultDueDate());
  const [tenants, setTenants] = useState<string[]>([address || '']);
  const [shares, setShares] = useState<string[]>(['10000']);

  const addTenant = () => {
    setTenants([...tenants, '']);
    setShares([...shares, '']);
  };

  const removeTenant = (index: number) => {
    setTenants(tenants.filter((_, i) => i !== index));
    setShares(shares.filter((_, i) => i !== index));
  };

  const handleDeploy = () => {
    // Validation
    if (!recipient || !/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
      alert('Invalid recipient address');
      return;
    }
    if (!rentAmount || parseFloat(rentAmount) <= 0) {
      alert('Rent amount must be greater than 0');
      return;
    }
    if (!dueDate) {
      alert('Please select a due date');
      return;
    }
    const dueDateTimestamp = Math.floor(new Date(dueDate).getTime() / 1000);
    if (dueDateTimestamp <= Math.floor(Date.now() / 1000)) {
      alert('Due date must be in the future');
      return;
    }

    // Validate tenants
    for (const tenant of tenants) {
      if (!tenant || !/^0x[a-fA-F0-9]{40}$/.test(tenant)) {
        alert('All tenant addresses must be valid');
        return;
      }
    }

    // Validate shares sum to 10000
    const totalShares = shares.reduce((sum, s) => sum + parseInt(s || '0'), 0);
    if (totalShares !== 10000) {
      alert(`Shares must sum to 10,000 basis points (currently: ${totalShares})`);
      return;
    }

    const params: RentVaultParams = {
      recipient: recipient as `0x${string}`,
      rentAmount: parseUnits(rentAmount, 6), // USDC has 6 decimals
      dueDate: BigInt(dueDateTimestamp),
      tenants: tenants as `0x${string}`[],
      shareBps: shares.map(s => BigInt(s)),
    };

    console.log('📋 Deploying with params:', params);
    onDeploy(CONTRACT_TEMPLATES.RENT_VAULT, params);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Landlord/Recipient Address
        </label>
        <input
          type="text"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="0x..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Total Rent Amount (USDC)
        </label>
        <input
          type="number"
          value={rentAmount}
          onChange={(e) => setRentAmount(e.target.value)}
          placeholder="1000"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Due Date (must be in the future)
        </label>
        <input
          type="datetime-local"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          min={new Date().toISOString().slice(0, 16)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">
          Default: 30 days from now
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tenants & Shares (Basis Points - must sum to 10,000)
        </label>
        {tenants.map((tenant, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input
              type="text"
              value={tenant}
              onChange={(e) => {
                const newTenants = [...tenants];
                newTenants[i] = e.target.value;
                setTenants(newTenants);
              }}
              placeholder="Tenant address"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
            />
            <input
              type="number"
              value={shares[i]}
              onChange={(e) => {
                const newShares = [...shares];
                newShares[i] = e.target.value;
                setShares(newShares);
              }}
              placeholder="BPS (e.g., 5000)"
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg"
            />
            {tenants.length > 1 && (
              <button
                onClick={() => removeTenant(i)}
                className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button
          onClick={addTenant}
          className="text-sm text-blue-600 hover:underline"
        >
          + Add Tenant
        </button>
      </div>

      <button
        onClick={handleDeploy}
        disabled={isDeploying}
        className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
      >
        {isDeploying ? 'Deploying...' : 'Deploy Rent Vault'}
      </button>
    </div>
  );
}

// GroupBuyEscrow Form
function GroupBuyEscrowForm({
  onDeploy,
  isDeploying,
}: {
  onDeploy: (template: ContractTemplate, params: GroupBuyEscrowParams) => Promise<void>;
  isDeploying: boolean;
}) {
  const { address } = useAccount();
  const [recipient, setRecipient] = useState(address || '');
  const [fundingGoal, setFundingGoal] = useState('5000');

  // Set default expiry to 30 days from now
  const getDefaultExpiryDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().slice(0, 16);
  };

  const [expiryDate, setExpiryDate] = useState(getDefaultExpiryDate());
  const [timelockDelay, setTimelockDelay] = useState('7'); // days
  const [participants, setParticipants] = useState<string[]>([address || '']);
  const [shares, setShares] = useState<string[]>(['10000']);

  const addParticipant = () => {
    setParticipants([...participants, '']);
    setShares([...shares, '']);
  };

  const removeParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index));
    setShares(shares.filter((_, i) => i !== index));
  };

  const handleDeploy = () => {
    // Validation
    if (!recipient || !/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
      alert('Invalid recipient address');
      return;
    }
    if (!fundingGoal || parseFloat(fundingGoal) <= 0) {
      alert('Funding goal must be greater than 0');
      return;
    }
    if (!expiryDate) {
      alert('Please select an expiry date');
      return;
    }
    const expiryTimestamp = Math.floor(new Date(expiryDate).getTime() / 1000);
    if (expiryTimestamp <= Math.floor(Date.now() / 1000)) {
      alert('Expiry date must be in the future');
      return;
    }

    // Validate participants
    for (const participant of participants) {
      if (!participant || !/^0x[a-fA-F0-9]{40}$/.test(participant)) {
        alert('All participant addresses must be valid');
        return;
      }
    }

    // Validate shares sum to 10000
    const totalShares = shares.reduce((sum, s) => sum + parseInt(s || '0'), 0);
    if (totalShares !== 10000) {
      alert(`Shares must sum to 10,000 basis points (currently: ${totalShares})`);
      return;
    }

    const timelockSeconds = parseInt(timelockDelay) * 24 * 60 * 60;
    const params: GroupBuyEscrowParams = {
      recipient: recipient as `0x${string}`,
      fundingGoal: parseUnits(fundingGoal, 6),
      expiryDate: BigInt(expiryTimestamp),
      timelockRefundDelay: BigInt(timelockSeconds),
      participants: participants as `0x${string}`[],
      shareBps: shares.map(s => BigInt(s)),
    };

    console.log('📋 Deploying with params:', params);
    onDeploy(CONTRACT_TEMPLATES.GROUP_BUY_ESCROW, params);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Recipient/Seller Address
        </label>
        <input
          type="text"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="0x..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Funding Goal (USDC)
        </label>
        <input
          type="number"
          value={fundingGoal}
          onChange={(e) => setFundingGoal(e.target.value)}
          placeholder="5000"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Expiry Date (must be in the future)
        </label>
        <input
          type="datetime-local"
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
          min={new Date().toISOString().slice(0, 16)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">
          Default: 30 days from now
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Timelock Refund Delay (days)
        </label>
        <input
          type="number"
          value={timelockDelay}
          onChange={(e) => setTimelockDelay(e.target.value)}
          placeholder="7"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Participants & Shares (Basis Points - must sum to 10,000)
        </label>
        {participants.map((participant, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input
              type="text"
              value={participant}
              onChange={(e) => {
                const newParticipants = [...participants];
                newParticipants[i] = e.target.value;
                setParticipants(newParticipants);
              }}
              placeholder="Participant address"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
            />
            <input
              type="number"
              value={shares[i]}
              onChange={(e) => {
                const newShares = [...shares];
                newShares[i] = e.target.value;
                setShares(newShares);
              }}
              placeholder="BPS"
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg"
            />
            {participants.length > 1 && (
              <button
                onClick={() => removeParticipant(i)}
                className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button
          onClick={addParticipant}
          className="text-sm text-blue-600 hover:underline"
        >
          + Add Participant
        </button>
      </div>

      <button
        onClick={handleDeploy}
        disabled={isDeploying}
        className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
      >
        {isDeploying ? 'Deploying...' : 'Deploy Group Buy Escrow'}
      </button>
    </div>
  );
}

// StableAllowanceTreasury Form
function StableAllowanceTreasuryForm({
  onDeploy,
  isDeploying,
}: {
  onDeploy: (template: ContractTemplate, params: StableAllowanceTreasuryParams) => Promise<void>;
  isDeploying: boolean;
}) {
  const { address } = useAccount();
  const [owner, setOwner] = useState(address || '');
  const [recipient, setRecipient] = useState('');
  const [allowance, setAllowance] = useState('500');

  const handleDeploy = () => {
    // Validation
    if (!owner || !/^0x[a-fA-F0-9]{40}$/.test(owner)) {
      alert('Invalid owner address');
      return;
    }
    if (!recipient || !/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
      alert('Invalid recipient address');
      return;
    }
    if (owner.toLowerCase() === recipient.toLowerCase()) {
      alert('Owner and recipient cannot be the same address');
      return;
    }
    if (!allowance || parseFloat(allowance) <= 0) {
      alert('Allowance must be greater than 0');
      return;
    }

    const params: StableAllowanceTreasuryParams = {
      owner: owner as `0x${string}`,
      recipient: recipient as `0x${string}`,
      allowancePerIncrement: parseUnits(allowance, 6),
    };

    console.log('📋 Deploying with params:', params);
    onDeploy(CONTRACT_TEMPLATES.STABLE_ALLOWANCE_TREASURY, params);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Owner Address (Controls approvals)
        </label>
        <input
          type="text"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          placeholder="0x..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">
          The address that approves each allowance release
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Recipient Address (Receives allowances)
        </label>
        <input
          type="text"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="0x... (must be different from owner)"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">
          The address that receives funds (cannot be the same as owner)
        </p>
        {owner && recipient && owner.toLowerCase() === recipient.toLowerCase() && (
          <p className="text-xs text-red-600 mt-1 font-semibold">
            ⚠️ Owner and recipient cannot be the same address
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Allowance Per Increment (USDC)
        </label>
        <input
          type="number"
          value={allowance}
          onChange={(e) => setAllowance(e.target.value)}
          placeholder="500"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">
          Amount released each time the owner increments the approval counter
        </p>
      </div>

      <button
        onClick={handleDeploy}
        disabled={isDeploying}
        className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
      >
        {isDeploying ? 'Deploying...' : 'Deploy Allowance Treasury'}
      </button>
    </div>
  );
}
