'use client';

import {useSession} from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {
  Home as HomeIcon,
  Wallet as WalletIcon,
  Coins as CoinsIcon,
  Landmark as LandmarkIcon,
  Dog as PetsIcon,
  Settings as SettingsIcon,
  Sparkles as SparklesIcon,
  Menu as MenuIcon,
} from 'lucide-react';
import {Button} from '@/components/ui/button';
import FureverLogo from '@/public/furever_logo.png';
import Stripe from 'stripe';
import {Switch} from '@/components/ui/switch';
import {Label} from '@/components/ui/label';
import {useToolsContext} from '../hooks/ToolsPanelProvider';
import * as React from 'react';

const navigationMenuItems = [
  {
    label: 'Home',
    href: '/home',
    icon: HomeIcon,
    paths: [],
  },
  {
    label: 'Pets',
    href: '/pets',
    icon: PetsIcon,
    paths: [],
  },
  {
    label: 'Payments',
    href: '/payments',
    icon: WalletIcon,
    paths: [],
  },
  {
    label: 'Payouts',
    href: '/payouts',
    icon: CoinsIcon,
    paths: [],
  },
  {
    label: 'Finances',
    href: '/finances',
    icon: LandmarkIcon,
    paths: ['/finances/cards'],
    shouldDisplayFilter: (stripeAccount: Stripe.Account) =>
      stripeAccount.controller?.stripe_dashboard?.type === 'none' &&
      stripeAccount.controller?.losses?.payments === 'application' &&
      stripeAccount.controller?.requirement_collection === 'application',
  },
  {
    label: 'Account',
    href: '/settings',
    icon: SettingsIcon,
    paths: ['/settings/documents', '/settings/tax'],
  },
];

const Nav = () => {
  const pathname = usePathname();
  const {data: session} = useSession();

  const stripeAccount = session?.user?.stripeAccount;
  const {open, handleOpenChange} = useToolsContext();

  const [showMobileNavItems, setShowMobileNavItems] = React.useState(false);

  return (
    <div className="border-gray-border fixed z-50 w-full flex-col border-b bg-screen-foreground sm:fixed sm:flex sm:h-screen sm:w-52 sm:border-b-0 sm:border-r sm:p-1 lg:w-64 lg:p-3">
      <div className="flex items-center justify-between p-3 sm:mb-4">
        <Link href="/home">
          <div className="flex items-center gap-3 text-xl font-bold text-primary">
            <Image
              width={36}
              height={36}
              src={session?.user?.companyLogoUrl || FureverLogo}
              alt={`${session?.user?.companyName || 'Furever'} Logo`}
              className="h-9 w-9 sm:h-10 sm:w-10"
              sizes="100px"
              priority
            />
            {session?.user?.companyName || 'Furever'}
          </div>
        </Link>
        <Button
          variant="ghost"
          className="sm:hidden"
          onClick={() => setShowMobileNavItems(!showMobileNavItems)}
        >
          <MenuIcon />
        </Button>
      </div>
      <nav
        className={`${showMobileNavItems ? 'flex' : 'hidden'} w-full flex-1 p-2 pb-3 shadow-xl transition sm:flex sm:p-0 sm:shadow-none`}
      >
        <ul className="w-full flex-col">
          {navigationMenuItems
            .filter(({shouldDisplayFilter}) => {
              // Not all pages require a filter.
              if (!shouldDisplayFilter || !stripeAccount) {
                return true;
              }

              return shouldDisplayFilter(stripeAccount);
            })
            .map((item) => (
              <li key={item.label} className="p-1">
                <Link href={item.href}>
                  <Button
                    className={`w-full justify-start text-lg text-primary hover:bg-accent-subdued ${
                      pathname === item.href || item.paths.includes(pathname)
                        ? 'bg-accent-subdued text-accent'
                        : 'bg-foreground'
                    }`}
                    onClick={() => setShowMobileNavItems(false)}
                    tabIndex={-1}
                  >
                    <item.icon
                      className="mr-2"
                      size={20}
                      color={`${
                        pathname === item.href || item.paths.includes(pathname)
                          ? 'var(--accent)'
                          : 'var(--primary)'
                      }`}
                    />{' '}
                    {item.label}
                  </Button>
                </Link>
              </li>
            ))}
        </ul>
      </nav>
      <div
        className={`${open ? 'invisible opacity-0' : 'opacity-100'} fixed bottom-2 left-1/2 w-[calc(100%-20px)] -translate-x-1/2 rounded-lg border bg-gradient-to-tr from-[#E4E5F9] to-[#DAEFF7] p-2 shadow-lg transition dark:bg-gradient-to-tr dark:from-[#2D314A] dark:to-[#233B48] sm:relative sm:bottom-0 sm:w-full sm:p-3 sm:shadow-none`}
      >
        <div className="flex hidden items-center gap-2 font-bold text-primary sm:flex">
          <SparklesIcon size={20} color="var(--primary)" />
          <p className="">Tools</p>
        </div>
        <p className="mb-2 text-[15px] text-primary sm:mb-4">
          Access tools to customize embedded components and create test data.
        </p>
        <Button
          size="sm"
          className="hover w-full bg-gradient-to-r from-[#7F81FA] to-[#49B8EF] text-white shadow"
          onClick={() => {
            handleOpenChange(true);
          }}
        >
          Open tools
        </Button>
      </div>
    </div>
  );
};

export default Nav;
