'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import AppLayout from '@/components/layout/AppLayout';
import NetworkModeToggle from '@/components/settings/NetworkModeToggle';
import SettingRow from '@/components/settings/SettingRow';
import SettingsSection from '@/components/settings/SettingsSection';
import { useUserSettings } from '@/hooks/useUserSettings';
import { CIVITAS_FACTORY_ADDRESS } from '@/lib/contracts/constants';
import { ExternalLink, RefreshCw } from 'lucide-react';

type SettingsCategory = 'network' | 'display' | 'about';

export default function SettingsPage() {
  const { address, isConnected } = useAccount();
  const { settings, isLoading, updateSettings, isUpdating } = useUserSettings(address);
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('network');

  // Sync localStorage network mode on mount
  useEffect(() => {
    if (settings?.network_mode && typeof window !== 'undefined') {
      const storedMode = localStorage.getItem('civitas_network_mode');
      if (storedMode !== settings.network_mode) {
        localStorage.setItem('civitas_network_mode', settings.network_mode);
      }
    }
  }, [settings?.network_mode]);

  const handleNetworkToggle = async (newMode: 'mainnet' | 'testnet') => {
    updateSettings({ network_mode: newMode });
  };

  const handleSettingChange = (key: string, value: any) => {
    updateSettings({ [key]: value } as any);
  };

  const resetRpcEndpoints = () => {
    updateSettings({
      rpc_base_url: null,
      rpc_ethereum_url: null,
    });
  };

  const commandZone = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b-4 border-black bg-stark-white shrink-0">
        <h2 className="font-headline text-2xl uppercase tracking-tighter mb-2">Settings</h2>
        <div className="flex gap-2 items-center">
          <span className="text-xs font-display font-bold bg-black text-white !text-white px-2 py-1 border border-acid-lime" style={{ backgroundColor: 'black', color: 'white' }}>
            v1.0.0
          </span>
        </div>
      </div>

      {/* Settings Categories */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {!isConnected ? (
          <div className="text-center my-12">
            <div className="bg-stark-white border-4 border-black shadow-[8px_8px_0px_#000] p-12 inline-block">
              <p className="font-display font-bold text-black mb-4 uppercase">
                Wallet Not Connected
              </p>
              <p className="font-display text-sm text-gray-600">
                Connect your wallet to manage settings
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="font-display font-bold text-xs uppercase text-gray-600 mb-3">
              Categories
            </h3>
            {[
              { id: 'network', label: 'Network', important: true },
              { id: 'display', label: 'Display' },
              { id: 'about', label: 'About' },
            ].map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id as SettingsCategory)}
                className={`w-full text-left px-4 py-3 border-2 border-black font-display font-bold uppercase text-sm transition-all duration-200 ${activeCategory === category.id
                  ? 'bg-acid-lime text-black shadow-[4px_4px_0px_#000]'
                  : 'bg-stark-white text-black hover:bg-paper-cream cursor-pointer hover:shadow-[2px_2px_0px_#000]'
                  }`}
              >
                {category.label}
                {category.important && ' ⚡'}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const executionZone = (
    <div className="h-full overflow-auto p-6 md:p-12">
      {!isConnected ? (
        <div className="flex items-center justify-center h-full">
          <div className="bg-stark-white border-4 border-black shadow-[8px_8px_0px_#000] p-12 text-center">
            <p className="font-headline text-2xl uppercase mb-4">Connect Wallet</p>
            <p className="font-display text-gray-600">Connect your wallet to manage settings</p>
          </div>
        </div>
      ) : isLoading ? (
        <div className="space-y-6 max-w-3xl mx-auto">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-stark-white border-[3px] border-black shadow-[4px_4px_0px_#000] p-6 h-32 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-6 max-w-3xl mx-auto">
          {/* Network Settings */}
          {activeCategory === 'network' && (
            <>
              <NetworkModeToggle />

              {/* RPC Endpoints (Advanced) */}
              <SettingsSection title="RPC Endpoints (Advanced)">
                <SettingRow
                  label="Base RPC URL"
                  description="Custom RPC endpoint for Base network"
                  control={
                    <input
                      type="text"
                      value={settings?.rpc_base_url || ''}
                      onChange={(e) => handleSettingChange('rpc_base_url', e.target.value)}
                      placeholder="https://mainnet.base.org"
                      className="w-full bg-paper-cream border-2 border-black px-3 py-2 font-mono text-sm focus:outline-none focus:shadow-[4px_4px_0px_#000] transition-shadow"
                    />
                  }
                />
                <SettingRow
                  label="Ethereum RPC URL"
                  description="Custom RPC endpoint for Ethereum mainnet"
                  control={
                    <input
                      type="text"
                      value={settings?.rpc_ethereum_url || ''}
                      onChange={(e) => handleSettingChange('rpc_ethereum_url', e.target.value)}
                      placeholder="https://eth.llamarpc.com"
                      className="w-full bg-paper-cream border-2 border-black px-3 py-2 font-mono text-sm focus:outline-none focus:shadow-[4px_4px_0px_#000] transition-shadow"
                    />
                  }
                />
                <div className="pt-4">
                  <button
                    onClick={resetRpcEndpoints}
                    className="w-full bg-stark-white border-2 border-black px-4 py-3 font-display font-bold uppercase shadow-[4px_4px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000] transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-5 h-5" />
                    <span>Reset to Defaults</span>
                  </button>
                </div>
              </SettingsSection>
            </>
          )}

          {/* Display Settings */}
          {activeCategory === 'display' && (
            <SettingsSection title="Display Preferences">
              <SettingRow
                label="Currency Format"
                description="Preferred currency for displaying values"
                control={
                  <select
                    value={settings?.currency_display || 'USD'}
                    onChange={(e) => handleSettingChange('currency_display', e.target.value)}
                    className="w-full bg-paper-cream border-2 border-black px-3 py-2 font-display font-bold uppercase text-sm cursor-pointer focus:outline-none focus:shadow-[4px_4px_0px_#000] transition-shadow"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                }
              />
              <SettingRow
                label="Date Format"
                description="How dates are displayed throughout the app"
                control={
                  <select
                    value={settings?.date_format || 'MM/DD/YYYY'}
                    onChange={(e) => handleSettingChange('date_format', e.target.value)}
                    className="w-full bg-paper-cream border-2 border-black px-3 py-2 font-display font-bold uppercase text-sm cursor-pointer focus:outline-none focus:shadow-[4px_4px_0px_#000] transition-shadow"
                  >
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="ISO">ISO (YYYY-MM-DD)</option>
                  </select>
                }
              />
              <SettingRow
                label="Address Display"
                description="Show full addresses or truncated versions"
                control={
                  <select
                    value={settings?.address_display || 'truncated'}
                    onChange={(e) => handleSettingChange('address_display', e.target.value)}
                    className="w-full bg-paper-cream border-2 border-black px-3 py-2 font-display font-bold uppercase text-sm cursor-pointer focus:outline-none focus:shadow-[4px_4px_0px_#000] transition-shadow"
                  >
                    <option value="truncated">Truncated (0x1234...5678)</option>
                    <option value="full">Full Address</option>
                  </select>
                }
              />
            </SettingsSection>
          )}

          {/* About Section */}
          {activeCategory === 'about' && (
            <>
              <SettingsSection title="Application Info">
                <SettingRow
                  label="Version"
                  control={<span className="font-mono text-sm">1.0.0</span>}
                />
                <SettingRow
                  label="Network Mode"
                  control={
                    <span className="font-display font-bold text-sm uppercase">
                      {settings?.network_mode || 'testnet'}
                    </span>
                  }
                />
              </SettingsSection>

              <SettingsSection title="Smart Contracts">
                <SettingRow
                  label="CivitasFactory Address"
                  control={
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-xs break-all">
                        {CIVITAS_FACTORY_ADDRESS[settings?.network_mode === 'mainnet' ? base.id : baseSepolia.id]}
                      </code>
                      <a
                        href={`${settings?.network_mode === 'mainnet'
                          ? 'https://basescan.org'
                          : 'https://sepolia.basescan.org'
                          }/address/${CIVITAS_FACTORY_ADDRESS[settings?.network_mode === 'mainnet' ? base.id : baseSepolia.id]}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-acid-lime border-2 border-black hover:bg-hot-pink transition-colors cursor-pointer shrink-0"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  }
                />
              </SettingsSection>

              <SettingsSection title="Resources">
                <div className="space-y-3">
                  <a
                    href="https://github.com/your-repo"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-void-black text-stark-white border-2 border-black px-4 py-3 font-display font-bold uppercase shadow-[4px_4px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000] transition-all text-center cursor-pointer"
                  >
                    GitHub Repository
                  </a>
                  <a
                    href="https://docs.civitas.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-stark-white border-2 border-black px-4 py-3 font-display font-bold uppercase shadow-[4px_4px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000] transition-all text-center cursor-pointer"
                  >
                    Documentation
                  </a>
                </div>
              </SettingsSection>
            </>
          )}
        </div>
      )}
    </div>
  );

  return <AppLayout activeNavItem="settings" commandZone={commandZone} executionZone={executionZone} />;
}
