'use client';

import {ConnectAccountOnboarding} from '@stripe/react-connect-js';
import EmbeddedComponentContainer from '@/app/components/EmbeddedComponentContainer';
import React from 'react';

// This is the page that we show to demonstrate onboarding
// a specific connected account
export default function Register() {
  return (
    <EmbeddedComponentContainer componentName="AccountOnboarding">
      <ConnectAccountOnboarding
        onExit={() => {
          window.location.href = '/home';
        }}
      />
    </EmbeddedComponentContainer>
  );
}
