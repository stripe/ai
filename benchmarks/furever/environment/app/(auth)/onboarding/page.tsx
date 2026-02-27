'use client';

import {ConnectAccountOnboarding} from '@stripe/react-connect-js';
import EmbeddedComponentContainer from '@/app/components/EmbeddedComponentContainer';
import React from 'react';

export default function Onboarding() {
  return (
    <EmbeddedComponentContainer componentName="AccountOnboarding">
      <ConnectAccountOnboarding
        onExit={() => {
          window.location.href = '/home?shownux=true';
        }}
      />
    </EmbeddedComponentContainer>
  );
}
