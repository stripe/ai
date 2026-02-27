'use client';

import React from 'react';
import {useRouter} from 'next/navigation';
import {signIn} from 'next-auth/react';

// https://lucide.dev/icons/
import {
  Home as HomeIcon,
  Wallet as WalletIcon,
  Coins as CoinsIcon,
  Landmark as LandmarkIcon,
  Settings as SettingsIcon,
  Milestone as MilestoneIcon,
  LogIn as LogInIcon,
  Loader as LoaderIcon,
  Key as KeyIcon,
} from 'lucide-react';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

import {SettingsContext} from '@/app/contexts/settings';
import changeLocale from '@/app/components/debug/commands/ChangeLocale';
import CreateReceivedCredit from '@/app/components/debug/commands/CreateReceivedCredit';
import CreateIssuingCardAuthorization from '@/app/components/debug/commands/CreateIssuingCardAuthorization';
import CreateCheckoutSession from '@/app/components/debug/commands/CreateCheckoutSession';

const settingsCommands = [changeLocale];

const stripeCommands = [
  CreateReceivedCredit,
  CreateIssuingCardAuthorization,
  CreateCheckoutSession,
];

const DebugMenu = () => {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [commandError, setCommandError] = React.useState<Error | null>(null);
  const [actionMenu, setActionMenu] = React.useState<React.ReactNode | null>(
    null
  );

  const settings = React.useContext(SettingsContext);

  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        {actionMenu}
        {!actionMenu && (
          <>
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Settings">
                {settingsCommands.map((command, id) => (
                  <CommandItem
                    key={id}
                    onSelect={async () => {
                      const [error, ui] = await command.action();
                      if (error) {
                        console.error(error);
                      }

                      if (!ui) {
                        setOpen(false);
                        return;
                      }

                      const exit = () => {
                        setOpen(false);
                        setActionMenu(null);
                      };

                      setActionMenu(ui(exit, settings));
                    }}
                    className="aria-selected:text-black aria-selected:opacity-100"
                  >
                    <command.icon className="mr-2 h-4 w-4" />
                    <span>{command.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup heading="Stripe">
                {stripeCommands.map((command, id) => (
                  <CommandItem
                    key={id}
                    onSelect={async () => {
                      const error = await command.action();
                      if (error) {
                        console.error(error);
                      }
                      setOpen(false);
                    }}
                    className="aria-selected:text-black aria-selected:opacity-100"
                  >
                    <command.icon className="mr-2 h-4 w-4" />
                    <span>{command.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup heading="Navigation">
                <CommandItem
                  onSelect={() => {
                    router.push('/');
                    setOpen(false);
                  }}
                >
                  <HomeIcon className="mr-2 h-4 w-4" />
                  <span>Home</span>
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    router.push('/payments');
                    setOpen(false);
                  }}
                >
                  <WalletIcon className="mr-2 h-4 w-4" />
                  <span>Payments</span>
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    router.push('/payouts');
                    setOpen(false);
                  }}
                >
                  <CoinsIcon className="mr-2 h-4 w-4" />
                  <span>Payouts</span>
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    router.push('/finances');
                    setOpen(false);
                  }}
                >
                  <LandmarkIcon className="mr-2 h-4 w-4" />
                  <span>Finances</span>
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    router.push('/settings');
                    setOpen(false);
                  }}
                >
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </CommandItem>
              </CommandGroup>
              {process.env.NODE_ENV !== 'production' && (
                <CommandGroup heading="Demo">
                  <CommandItem
                    onSelect={async () => {
                      // Get the login as demo account id
                      setLoading(true);
                      setCommandError(null);

                      try {
                        const response = await fetch(
                          '/api/debug/get_demo_account',
                          {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                          }
                        );
                        const json = await response.json();
                        if (json.error) {
                          throw new Error(json.error);
                        }
                        const {accountId} = json;

                        // Login as that account
                        await signIn('loginas', {
                          accountId,
                          redirect: false,
                        });

                        console.log('Logged in as demo account', accountId);

                        // Ensure we're in the en-US locale
                        settings.handleUpdate({locale: 'en-US'});

                        router.push('/');
                        setLoading(false);
                        setOpen(false);
                      } catch (error: any) {
                        console.error(
                          'An error occurred when logging in as a demo account',
                          error
                        );
                        setCommandError(error);
                        setLoading(false);
                      }
                    }}
                  >
                    {loading ? (
                      <LoaderIcon className="mr-2 h-4 w-4" />
                    ) : (
                      <LogInIcon className="mr-2 h-4 w-4" />
                    )}
                    <span>
                      {loading
                        ? 'Logging in as Demo account...'
                        : 'Login as Demo Account'}
                    </span>
                    {commandError && (
                      <div className="ml-2 text-red-500">
                        Error: {commandError.message}
                      </div>
                    )}
                  </CommandItem>
                  <CommandItem
                    onSelect={() => {
                      router.push('/register');
                      setOpen(false);
                    }}
                  >
                    <MilestoneIcon className="mr-2 h-4 w-4" />
                    <span>Demo Onboarding Registration</span>
                  </CommandItem>
                  <CommandItem
                    onSelect={() => {
                      router.push('/loginas');
                      setOpen(false);
                    }}
                  >
                    <KeyIcon className="mr-2 h-4 w-4" />
                    <span>Login As</span>
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </>
        )}
      </CommandDialog>
    </>
  );
};

export default DebugMenu;
