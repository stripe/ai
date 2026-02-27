'use client';

import {signOut} from 'next-auth/react';
import SubNav from '@/app/components/SubNav';
import {Button} from '@/components/ui/button';
import {useConnectJSContext} from '@/app/hooks/EmbeddedComponentProvider';
import {ExternalLink} from 'lucide-react';
import {useExpressDashboardLoginLink} from '@/app/hooks/useExpressDashboardLoginLink';

export default function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const connectJSContext = useConnectJSContext();

  const {hasExpressDashboardAccess, expressDashboardLoginLink} =
    useExpressDashboardLoginLink();

  return (
    <>
      <header className="flex flex-col justify-between md:flex-row">
        <div className="flex flex-row">
          <h1 className="text-3xl font-bold">Your account</h1>
        </div>
        <div className="mt-4 flex flex-row md:mt-0">
          <SubNav
            base="/settings"
            routes={[
              {path: '/settings', label: 'General'},
              {path: '/settings/documents', label: 'Documents'},
              {path: '/settings/tax', label: 'Tax'},
            ]}
          />
          {hasExpressDashboardAccess && (
            <div>
              <Button
                className="text-md ml-2 self-end p-2 hover:bg-white/80 hover:text-primary"
                variant="ghost"
                onClick={async () => {
                  window.open(expressDashboardLoginLink, '_blank');
                }}
                aria-label="Open Stripe Express Dashboard"
              >
                Express Dashboard &nbsp;
                <ExternalLink color="var(--subdued)" size={20} />
              </Button>
            </div>
          )}
          <div>
            <Button
              className="text-md ml-2 self-end p-2 hover:bg-white/80 hover:text-primary"
              variant="ghost"
              onClick={async () => {
                await connectJSContext.connectInstance?.logout();
                signOut({callbackUrl: '/'});
              }}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>
      {children}
    </>
  );
}
