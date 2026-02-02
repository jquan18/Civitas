'use client';

import { useAccount } from 'wagmi';
import Link from 'next/link';
import { Brain, Zap, Link2 } from 'lucide-react';
import TactileButton from '@/components/ui/TactileButton';
import HardShadowCard from '@/components/ui/HardShadowCard';
import MarqueeTicker from '@/components/layout/MarqueeTicker';
import { VideoSplashScreen } from '@/components/splash/VideoSplashScreen';
import { NeoBrutalistConnectButton } from '@/components/wallet/NeoBrutalistConnectButton';

export default function Home() {
  const { isConnected } = useAccount();

  return (
    <VideoSplashScreen>
      <div className="min-h-screen bg-paper-cream flex flex-col relative">
      {/* Marquee Ticker */}
      <MarqueeTicker />

      {/* Top Right Section - Connect Button or Warning */}
      <div className="absolute top-[60px] right-6 z-40">
        {!isConnected && (
          <div className="bg-warning-yellow border-4 border-black shadow-[8px_8px_0px_#000] p-4 mb-3 max-w-xs">
            <p className="font-display font-bold text-xs uppercase text-center mb-2">
              ⚠️ Wallet Required
            </p>
            <p className="font-display text-xs text-center mb-3">
              Connect to unlock features
            </p>
          </div>
        )}
        <NeoBrutalistConnectButton />
      </div>

      {/* Hero Section */}
      <div className="flex-grow flex flex-col items-center justify-center px-4 py-16 relative">
        {/* Background Dot Grid Pattern */}
        <div className="absolute inset-0 pattern-grid pointer-events-none"></div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <h1 className="font-headline text-[96px] sm:text-[120px] uppercase leading-none mb-6 text-black">
            CIVITAS
          </h1>

          <p className="font-display font-bold text-2xl sm:text-3xl mb-12 max-w-3xl mx-auto text-black">
            The first AI Agent that negotiates, deploys, and funds cross-chain agreements in a single click.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
            {isConnected ? (
              <>
                <Link href="/create">
                  <TactileButton variant="primary" className="text-xl px-10 py-5">
                    Create Agreement
                  </TactileButton>
                </Link>
                <Link href="/dashboard">
                  <TactileButton variant="outline" className="text-xl px-10 py-5">
                    View Dashboard
                  </TactileButton>
                </Link>
              </>
            ) : (
              <div className="flex flex-col sm:flex-row gap-6">
                {/* Disabled Buttons with Lock Icon */}
                <button
                  disabled
                  className="bg-gray-300 text-gray-500 border-[3px] border-gray-400 text-xl px-10 py-5 font-display font-black uppercase shadow-[4px_4px_0px_rgba(0,0,0,0.2)] cursor-not-allowed"
                >
                  <span className="flex items-center gap-2">
                    🔒 Create Agreement
                  </span>
                </button>
                <button
                  disabled
                  className="bg-gray-300 text-gray-500 border-[3px] border-gray-400 text-xl px-10 py-5 font-display font-black uppercase shadow-[4px_4px_0px_rgba(0,0,0,0.2)] cursor-not-allowed"
                >
                  <span className="flex items-center gap-2">
                    🔒 View Dashboard
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Feature 1 - AI-Powered Logic */}
            <HardShadowCard hoverable className="p-8 text-left">
              <div className="mb-4">
                <Brain className="w-12 h-12 text-black" strokeWidth={3} />
              </div>
              <h3 className="font-display font-bold text-xl mb-3 text-black">
                AI-Powered Logic
              </h3>
              <p className="font-display text-sm text-black">
                Natural language to smart contract configuration. Just chat and deploy.
              </p>
            </HardShadowCard>

            {/* Feature 2 - Cross-Chain Liquidity */}
            <HardShadowCard hoverable className="p-8 text-left">
              <div className="mb-4">
                <Zap className="w-12 h-12 text-black" strokeWidth={3} />
              </div>
              <h3 className="font-display font-bold text-xl mb-3 text-black">
                Cross-Chain Liquidity
              </h3>
              <p className="font-display text-sm text-black">
                Fund from any token on any chain via LI.FI. Seamless bridging built-in.
              </p>
            </HardShadowCard>

            {/* Feature 3 - Human-Readable Identity */}
            <HardShadowCard hoverable className="p-8 text-left">
              <div className="mb-4">
                <Link2 className="w-12 h-12 text-black" strokeWidth={3} />
              </div>
              <h3 className="font-display font-bold text-xl mb-3 text-black">
                Human-Readable Identity
              </h3>
              <p className="font-display text-sm text-black">
                Basenames for memorable contract addresses. No more 0x confusion.
              </p>
            </HardShadowCard>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-void-black border-t-4 border-black py-8 px-4 relative z-10">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="font-display text-stark-white text-sm">
            Built for ETH HackMoney 2026
          </p>
          <div className="flex gap-6">
            <a
              href="https://github.com"
              className="font-display text-stark-white hover:text-acid-lime transition-colors text-sm"
            >
              GitHub
            </a>
            <a
              href="#"
              className="font-display text-stark-white hover:text-acid-lime transition-colors text-sm"
            >
              Docs
            </a>
            <a
              href="#"
              className="font-display text-stark-white hover:text-acid-lime transition-colors text-sm"
            >
              Twitter
            </a>
          </div>
        </div>
      </footer>
    </div>
    </VideoSplashScreen>
  );
}
