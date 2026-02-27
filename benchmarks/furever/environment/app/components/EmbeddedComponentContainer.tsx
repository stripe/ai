import {useEmbeddedComponentBorder} from '@/app/hooks/EmbeddedComponentBorderProvider';
import {ChevronRight} from 'lucide-react';

const EmbeddedComponentContainer = ({
  children,
  className,
  componentName,
}: {
  children: React.ReactNode;
  className?: string;
  componentName: string;
}) => {
  const {enableBorder} = useEmbeddedComponentBorder();

  const ComponentDetails = () => {
    const ComponentURLs: {[key: string]: any} = {
      AccountManagement:
        'https://docs.stripe.com/connect/supported-embedded-components/account-management',
      AccountOnboarding:
        'https://docs.stripe.com/connect/supported-embedded-components/account-onboarding',
      Balances:
        'https://docs.stripe.com/connect/supported-embedded-components/balances',
      CapitalFinancingPromotion:
        'https://docs.stripe.com/connect/supported-embedded-components/capital-financing-promotion',
      CapitalFinancingApplication:
        'https://docs.stripe.com/connect/supported-embedded-components/capital-financing-application',
      CapitalFinancing:
        'https://docs.stripe.com/connect/supported-embedded-components/capital-financing',
      Documents:
        'https://docs.stripe.com/connect/supported-embedded-components/documents',
      FinancialAccount:
        'https://docs.stripe.com/connect/supported-embedded-components/financial-account',
      FinancialAccountTransactions:
        'https://docs.stripe.com/connect/supported-embedded-components/financial-account-transactions',
      InstantPayouts:
        'https://docs.stripe.com/connect/supported-embedded-components/instant-payouts',
      IssuingCard:
        'https://docs.stripe.com/connect/supported-embedded-components/issuing-card',
      IssuingCardsList:
        'https://docs.stripe.com/connect/supported-embedded-components/issuing-cards-list',
      NotificationBanner:
        'https://docs.stripe.com/connect/supported-embedded-components/notification-banner',
      Payments:
        'https://docs.stripe.com/connect/supported-embedded-components/payments',
      Payouts:
        'https://docs.stripe.com/connect/supported-embedded-components/payouts',
      PayoutsList:
        'https://docs.stripe.com/connect/supported-embedded-components/payouts-list',
      PaymentMethodSettings:
        'https://docs.stripe.com/connect/supported-embedded-components/payment-method-settings',
      TaxRegistrations:
        'https://docs.stripe.com/connect/supported-embedded-components/tax-registrations',
      TaxSettings:
        'https://docs.stripe.com/connect/supported-embedded-components/tax-settings',
      TaxThresholdMonitoring:
        'https://docs.stripe.com/connect/supported-embedded-components/tax-threshold-monitoring',
      ExportTaxTransactions:
        'https://docs.stripe.com/connect/supported-embedded-components/export-tax-transactions',
    };

    if (!enableBorder) {
      return;
    }

    if (componentName in ComponentURLs === false) {
      // If component name is not found, don't show the link
      return;
    }

    return (
      <div className="absolute -top-9 right-0 z-40 flex max-w-full gap-2 pb-2 transition duration-150 group-hover:opacity-100 sm:opacity-0">
        <a
          className="flex max-w-full items-center gap-1 truncate rounded border bg-component px-1.5 py-0.5 font-mono font-bold text-white shadow-lg"
          href={ComponentURLs[componentName]}
          target="_blank"
        >
          <div className="truncate">{componentName}</div>
          <ChevronRight className="sm:hidden" size="16" />
        </a>
        <a
          className="flex hidden items-center gap-1 rounded border bg-screen-background px-1.5 py-0.5 font-mono font-bold text-secondary shadow-lg hover:opacity-90 sm:flex"
          href={ComponentURLs[componentName]}
          target="_blank"
        >
          <div className="truncate">View in Docs</div>
          <ChevronRight size="16" />
        </a>
      </div>
    );
  };

  return (
    <div
      className={`${enableBorder ? 'm-[-4px] rounded-lg border-2 border-dashed border-component p-[8px]' : 'p-[6px]'} group relative transition-border duration-200 ${className}`}
    >
      <ComponentDetails />
      {children}
    </div>
  );
};

export default EmbeddedComponentContainer;
