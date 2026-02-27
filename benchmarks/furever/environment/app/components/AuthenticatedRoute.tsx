import React from 'react';
import {getServerSession} from 'next-auth';
import {redirect} from 'next/navigation';

export default async function AuthenticatedRoute({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession();

  if (!session || !session.user) {
    return null;
  }

  return <>{children}</>;
}
