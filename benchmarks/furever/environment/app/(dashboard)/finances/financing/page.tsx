'use client';

import React, {useState, useEffect} from 'react';
import {ConnectCapitalFinancing} from '@stripe/react-connect-js';
import Container from '@/app/components/Container';
import EmbeddedComponentContainer from '@/app/components/EmbeddedComponentContainer';
import {CapitalFinancingPromotionSection} from '@/app/components/CapitalFinancingPromotionSection';

function CapitalFinancingSection() {
  return (
    <Container>
      <EmbeddedComponentContainer componentName="CapitalFinancing">
        <ConnectCapitalFinancing onFinancingsLoaded={() => {}} />
      </EmbeddedComponentContainer>
    </Container>
  );
}

export default function FinancingPage() {
  return (
    <>
      <CapitalFinancingPromotionSection />
      <CapitalFinancingSection />
    </>
  );
}
