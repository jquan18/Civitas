'use client';

interface Chain {
  id: number;
  name: string;
  supported: boolean;
}

interface ChainSelectorProps {
  chains: Chain[];
  activeChain: number;
  onSelect: (chainId: number) => void;
}

export default function ChainSelector({ chains, activeChain, onSelect }: ChainSelectorProps) {
  return (
    <div className="space-y-2">
      <h3 className="font-display font-bold text-xs uppercase text-gray-600 mb-3">
        Select Chain
      </h3>
      {chains.map((chain) => (
        <button
          key={chain.id}
          onClick={() => chain.supported && onSelect(chain.id)}
          disabled={!chain.supported}
          className={`w-full text-left px-4 py-3 border-2 border-black font-display font-bold uppercase text-sm transition-all duration-200 ${
            activeChain === chain.id
              ? 'bg-acid-lime text-black shadow-[4px_4px_0px_#000]'
              : chain.supported
              ? 'bg-stark-white text-black hover:bg-paper-cream cursor-pointer'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          } ${activeChain === chain.id ? '' : 'hover:shadow-[2px_2px_0px_#000]'}`}
        >
          {chain.name}
          {!chain.supported && ' (Coming Soon)'}
        </button>
      ))}
    </div>
  );
}
