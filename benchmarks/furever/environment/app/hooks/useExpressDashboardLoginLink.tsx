import {useSession} from 'next-auth/react';
import {useEffect, useState} from 'react';

export const useExpressDashboardLoginLink = () => {
  const {data: session} = useSession();

  const hasExpressDashboardAccess =
    session?.user?.stripeAccount?.controller?.stripe_dashboard?.type ===
    'express';

  const [expressDashboardLoginLink, setExpressDashboardLoginLink] =
    useState<string>();

  useEffect(() => {
    const fetchLink = async () => {
      const res = await fetch('/api/login_link');
      const data = await res.json();
      setExpressDashboardLoginLink(data.url);
    };

    fetchLink();
  }, []);

  return {hasExpressDashboardAccess, expressDashboardLoginLink};
};
