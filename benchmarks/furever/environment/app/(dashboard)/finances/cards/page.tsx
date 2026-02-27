'use client';

import {ConnectIssuingCardsList} from '@stripe/react-connect-js';
import Container from '@/app/components/Container';
import EmbeddedComponentContainer from '@/app/components/EmbeddedComponentContainer';

export default function Finances() {
  return (
    <Container>
      <h1 className="mb-1 ml-2 text-xl font-bold">Cards</h1>
      <EmbeddedComponentContainer componentName="IssuingCardsList">
        <ConnectIssuingCardsList showSpendControls />
      </EmbeddedComponentContainer>
    </Container>
  );
}
