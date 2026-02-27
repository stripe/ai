'use client';
import * as React from 'react';
import {useSession} from 'next-auth/react';
import {useRouter} from 'next/navigation';
import {useEffect} from 'react';

export default function DataRequest({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const {data: session, update} = useSession();

  React.useEffect(() => {
    const fetchData = async () => {
      if (session?.user.setup) {
        return;
      }

      const res = await fetch('/api/setup_accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        await update({
          user: {
            ...session?.user,
            setup: true,
          },
        });
        window.location.reload();
      }
    };
    setTimeout(() => fetchData(), 10000);
  });

  return <>{children}</>;
}
