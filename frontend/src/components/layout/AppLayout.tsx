import NavigationRail from './NavigationRail';
import MarqueeTicker from './MarqueeTicker';

interface AppLayoutProps {
  commandZone: React.ReactNode;
  executionZone: React.ReactNode;
  activeNavItem: 'dashboard' | 'create' | 'transactions' | 'wallet' | 'settings';
}

export default function AppLayout({ commandZone, executionZone }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-paper-cream h-screen overflow-hidden relative">
      {/* NavigationRail - Fixed Left */}
      <NavigationRail />

      {/* Main Content Area */}
      <div className="flex flex-col h-full overflow-hidden ml-[88px]">
        {/* Marquee Ticker */}
        <MarqueeTicker />

        {/* Two-Zone Split */}
        <div className="flex-grow flex flex-col md:flex-row h-full overflow-hidden">
          {/* Command Zone - 45% */}
          <div className="w-full md:w-[45%] flex flex-col h-full bg-stark-white border-r-4 border-black">
            {commandZone}
          </div>

          {/* Execution Zone - 55% */}
          <div className="flex-1 bg-paper-cream relative overflow-auto">
            {executionZone}
          </div>
        </div>
      </div>
    </div>
  );
}
