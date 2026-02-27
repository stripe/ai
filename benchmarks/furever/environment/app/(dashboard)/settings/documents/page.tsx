'use client';

import Container from '@/app/components/Container';
import EmbeddedComponentContainer from '@/app/components/EmbeddedComponentContainer';
import {ConnectDocuments} from '@stripe/react-connect-js';

export default function Documents() {
  return (
    <Container>
      <header className="mb-8 ml-2">
        <h1 className="text-xl font-semibold">Documents</h1>
        <h2 className="text-subdued">
          Access documents and account statements.
        </h2>
      </header>
      <EmbeddedComponentContainer componentName="Documents">
        <ConnectDocuments />
      </EmbeddedComponentContainer>
    </Container>
  );
}
