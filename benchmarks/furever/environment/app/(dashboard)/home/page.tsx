'use client';
import React from 'react';
import Schedule from '@/app/components/Schedule';
import MonthToDateWidget from '@/app/components/MonthToDateWidget';
import CustomersWidget from '@/app/components/CustomersWidget';
import EmbeddedComponentContainer from '@/app/components/EmbeddedComponentContainer';
import {
  ConnectNotificationBanner,
  ConnectBalances,
} from '@stripe/react-connect-js';
import {useSession} from 'next-auth/react';
import {redirect} from 'next/navigation';
import Container from '@/app/components/Container';
import {CapitalFinancingPromotionSection} from '@/app/components/CapitalFinancingPromotionSection';

export default function Dashboard() {
  const {data: session} = useSession();
  if (!session) {
    redirect('/');
  }

  const name = session.user.stripeAccount.individual?.first_name;

  const BREAKPOINT = 1190;

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
      <h1 className="text-3xl font-bold" data-testid="title-header">
        Woof woof, {name || 'human'}!
      </h1>
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
      <div className="flex flex-col items-start gap-2 md:gap-5 xl:flex-row">
        <Container className="flex w-full flex-1 flex-col p-5">
          <Schedule />
        </Container>
        <div className="-order-1 flex w-full min-w-[370px] flex-col gap-2 md:gap-4 xl:order-2 xl:w-[30%]">
          <div className="flex flex-grow flex-col gap-2 md:gap-4 md:max-xl:flex-row">
            <Container className="flex-grow px-3 pt-3">
              <EmbeddedComponentContainer componentName="Balances">
                <ConnectBalances />
              </EmbeddedComponentContainer>
            </Container>
            <CapitalFinancingPromotionSection
              layout="banner"
              className="w-full px-5"
            />
          </div>
          <h2 className="hidden pt-4 text-lg font-bold xl:block">
            Performance
          </h2>
          <div className="flex flex-grow flex-col gap-2 md:gap-4 md:max-xl:flex-row">
            <MonthToDateWidget />
            <CustomersWidget />
          </div>
        </div>
      </div>
    </>
  );
}
