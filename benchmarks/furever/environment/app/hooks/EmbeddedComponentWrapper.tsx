'use client';

import {ConnectComponentsProvider} from '@stripe/react-connect-js';
import {EmbeddedComponentProvider} from '@/app/hooks/EmbeddedComponentProvider';
import {useConnect} from '@/app/hooks/useConnect';

export const EmbeddedComponentWrapper = ({
  demoOnboarding,
  children,
}: {
  demoOnboarding?: boolean;
  children: React.ReactNode;
}) => {
  const {hasError, stripeConnectInstance} = useConnect(!!demoOnboarding);
  
  // Show loading state during SSR and initial client-side load
  if (!stripeConnectInstance && !hasError) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-gray-500">Loading Stripe Connect...</div>
      </div>
    );
  }
  
  // Show error state if ConnectJS failed to load
  if (hasError) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-red-500">
          Failed to load Stripe Connect. Please refresh the page.
        </div>
      </div>
    );
  }

  // Render the embedded components once ConnectJS is loaded
  return (
    <ConnectComponentsProvider connectInstance={stripeConnectInstance!}>
      <EmbeddedComponentProvider connectInstance={stripeConnectInstance!}>
        {children}
      </EmbeddedComponentProvider>
    </ConnectComponentsProvider>
  );
};
