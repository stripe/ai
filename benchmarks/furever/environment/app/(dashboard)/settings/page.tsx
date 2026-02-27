'use client';

import * as React from 'react';
import {
  ConnectPaymentMethodSettings,
  ConnectAccountManagement,
  ConnectNotificationBanner,
} from '@stripe/react-connect-js';
import Container from '@/app/components/Container';
import EmbeddedComponentContainer from '@/app/components/EmbeddedComponentContainer';
import {useSession} from 'next-auth/react';
import EditAccountButton from '@/app/components/EditAccountButton';
import {Link} from '@/components/ui/link';

export default function Settings() {
  const {data: session} = useSession();
  const [showPassword, setShowPassword] = React.useState(false);
  const email = session?.user.email;
  const businessName = session?.user.businessName;
  const password = session?.user.password;

  const canShowPassword = !session?.user.changedPassword;

  const [showBanner, setShowBanner] = React.useState(false);

  const renderConditionallyCallback = (response: {
    total: number;
    actionRequired: number;
  }) => {
    if (response && response.total > 0) {
      setShowBanner(true);
    } else {
      setShowBanner(false);
    }
  };

  return (
    <>
      <div className={`${showBanner ? 'flex' : 'hidden'} flex-col`}>
        <EmbeddedComponentContainer
          componentName="NotificationBanner"
          className="overflow-hidden rounded-lg px-0 py-0 pb-1"
        >
          <ConnectNotificationBanner
            onNotificationsChange={renderConditionallyCallback}
          />
        </EmbeddedComponentContainer>
      </div>

      <Container className="pl-5">
        <div className="flex flex-row justify-between">
          <h1 className="mb-4 text-xl font-semibold">Details</h1>
          <div className="text-right align-top text-sm font-semibold text-accent">
            <EditAccountButton />
          </div>
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:gap-20">
          <div>
            <div className="text-subdued">Business name</div>
            <div className="font-medium">{businessName}</div>
          </div>
          <div>
            <div className="text-subdued">Email</div>
            <div className="font-medium">{email}</div>
          </div>
          <div>
            <div className="text-subdued">Password</div>
            <div className="font-medium">
              {showPassword && canShowPassword ? password : '••••••••'}
            </div>
            {canShowPassword && (
              <Link
                className="text-sm font-semibold text-accent"
                href="#"
                onClick={() => setShowPassword(!showPassword)}
              >
                {' '}
                {showPassword ? 'Hide password' : 'Show password'}
              </Link>
            )}
          </div>
        </div>
      </Container>
      <Container>
        <div className="flex flex-row items-center justify-between">
          <div className="flex flex-col items-start justify-between sm:flex-row">
            <header className="mb-5 ml-2">
              <h1 className="text-xl font-semibold">Account settings</h1>
              <h2 className="text-subdued">
                Manage account and business settings.
              </h2>
            </header>
          </div>
        </div>
        <div className="flex flex-col space-y-4">
          <EmbeddedComponentContainer componentName="AccountManagement">
            <ConnectAccountManagement />
          </EmbeddedComponentContainer>
        </div>
      </Container>

      <Container>
        <header className="mb-5 ml-2">
          <h1 className="text-xl font-semibold">Payment methods</h1>
          <h2 className="text-subdued">Add and manage your payment methods.</h2>
        </header>
        <EmbeddedComponentContainer componentName="PaymentMethodSettings">
          <ConnectPaymentMethodSettings />
        </EmbeddedComponentContainer>
      </Container>
    </>
  );
}
