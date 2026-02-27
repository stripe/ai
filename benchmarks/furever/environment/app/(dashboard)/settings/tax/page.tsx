'use client';

import Container from '@/app/components/Container';
import EmbeddedComponentContainer from '@/app/components/EmbeddedComponentContainer';
import {
  ConnectTaxSettings,
  ConnectTaxRegistrations,
  ConnectTaxThresholdMonitoring,
  ConnectExportTaxTransactions,
} from '@stripe/react-connect-js';

export default function Tax() {
  return (
    <>
      <Container>
        <h1 className="text-xl font-semibold">Tax</h1>
        <p className="text-subdued">
          Configure these settings to automatically calculate and collect tax on
          your payments.
        </p>
        <EmbeddedComponentContainer componentName="TaxSettings">
          <ConnectTaxSettings />
        </EmbeddedComponentContainer>
      </Container>
      <Container>
        <h1 className="text-xl font-semibold">Tax registrations</h1>
        <p className="text-subdued">
          Locations where you have a registration, and want to collect taxes.
        </p>
        <EmbeddedComponentContainer componentName="TaxRegistrations">
          <ConnectTaxRegistrations />
        </EmbeddedComponentContainer>
      </Container>
      <Container>
        <h1 className="text-xl font-semibold">Threshold Monitoring</h1>
        <p className="text-subdued">
          Sales tracked by tax location. Locations where thresholds have been
          exceeded may require registering to collect taxes.
        </p>
        <EmbeddedComponentContainer componentName="TaxThresholdMonitoring">
          <ConnectTaxThresholdMonitoring />
        </EmbeddedComponentContainer>
      </Container>
      <Container>
        <h1 className="text-xl font-semibold">Export tax transactions</h1>
        <p className="text-subdued">
          Retrieve and export your tax transactions for reporting and analysis
          purposes, ensuring compliance with tax regulations.
        </p>
        <EmbeddedComponentContainer componentName="ExportTaxTransactions">
          <ConnectExportTaxTransactions />
        </EmbeddedComponentContainer>
      </Container>
    </>
  );
}
