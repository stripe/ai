// EVAL_LEAK_CHECK: furever-ca518c14-4808-4ab9-974a-0551d0d97727-solution
'use client';

import {ConnectPayments} from '@stripe/react-connect-js';
import Container from '@/app/components/Container';
import EmbeddedComponentContainer from '@/app/components/EmbeddedComponentContainer';
import {LoaderCircle} from 'lucide-react';
import {useSession} from 'next-auth/react';
import React from 'react';

export default function Payments() {
  const {data: session} = useSession();
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(!session?.user.setup);
  }, [session?.user.setup]);

  return (
    <>
      <div className="flex flex-row items-center justify-between">
        <h1 className="text-3xl font-bold">Payments</h1>
      </div>
      <Container>
        <EmbeddedComponentContainer componentName="Payments">
          {loading ? (
            <div className="text-l flex items-center justify-center gap-1 py-16 text-center font-medium">
              <LoaderCircle
                className="mr-1 animate-spin items-center"
                size={20}
              />
              Creating test data
            </div>
          ) : (
            <ConnectPayments />
          )}
        </EmbeddedComponentContainer>
      </Container>
    </>
  );
}
