import {useFinancialAccount} from '@/app/hooks/useFinancialAccount';
import {Button} from '@/components/ui/button';
import {LoaderCircle, Plus} from 'lucide-react';
import React from 'react';

export default function CreateFinancialCreditButton({
  classes,
}: {
  classes?: string;
}) {
  const {
    financialAccount,
    error: useFinancialAccountError,
    loading,
  } = useFinancialAccount();
  const [buttonLoading, setButtonLoading] = React.useState(false);
  const displayFinancialAccount =
    !useFinancialAccountError && financialAccount && !loading;

  if (!displayFinancialAccount) {
    return null;
  }

  const onClick = async () => {
    setButtonLoading(true);
    try {
      const data = {
        financialAccount: financialAccount,
      };
      const res = await fetch('/api/setup_accounts/create_financial_credit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        setButtonLoading(false);
        window.location.reload();
      }
    } catch (e) {
      console.log('Error with creating test financial credit: ', e);
    }
  };
  return (
    <Button
      className={`${classes || 'border'}`}
      variant="ghost"
      onClick={onClick}
      disabled={buttonLoading}
      size="sm"
    >
      Create test financial credit
      {buttonLoading && (
        <LoaderCircle className="ml-2 animate-spin items-center" size={20} />
      )}
    </Button>
  );
}
