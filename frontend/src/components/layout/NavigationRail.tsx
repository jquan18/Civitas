'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, MessageSquare, ArrowLeftRight, Wallet, Settings } from 'lucide-react';

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

const navItems: NavItem[] = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/create', icon: MessageSquare, label: 'Create' },
  { href: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { href: '/wallet', icon: Wallet, label: 'Wallet' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export default function NavigationRail() {
  const pathname = usePathname();

  return (
    <aside className="w-[88px] bg-void-black flex flex-col items-center py-6 gap-8 border-r-4 border-black shrink-0 z-50 h-full fixed left-0 top-0">
      {/* Logo */}
      <div className="w-12 h-12 bg-hot-pink border-2 border-white flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] shrink-0">
        <span className="font-headline text-white text-2xl">C</span>
      </div>

      {/* Navigation Icons */}
      <nav className="flex flex-col gap-8 w-full items-center mt-4 flex-grow">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`transition-all duration-200 hover:scale-110 active:scale-95 group relative ${
                isActive
                  ? 'text-acid-lime'
                  : 'text-gray-500 hover:text-hot-pink'
              }`}
              aria-label={item.label}
            >
              <Icon
                className={`text-4xl w-10 h-10 ${
                  isActive ? 'drop-shadow-[0_0_8px_rgba(204,255,0,0.8)]' : ''
                }`}
              />
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
