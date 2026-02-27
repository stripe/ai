import {Button} from '@/components/ui/button';
import {LoaderCircle} from 'lucide-react';
import React from 'react';
import Stripe from 'stripe';
import {OfferState} from './types';
import {UseFormReturn} from 'react-hook-form';

const OFFER_STATES_TO_DISPLAY_ON: OfferState[] = ['accepted'];

export function TransitionFinancingButton({
  classes,
  offerState,
  label,
  fetchUrl,
  visibleForOfferStates,
  fetchMethod: method = 'POST',
  fetchBody = {},
  form,
}: {
  offerState: OfferState;
  label: string;
  fetchUrl: string;
  visibleForOfferStates: OfferState[];
  classes?: string;
  fetchMethod?: string;
  fetchBody?: {};
  form?: UseFormReturn<any>;
}) {
  const [buttonLoading, setButtonLoading] = React.useState(false);
  const onClick = async () => {
    setButtonLoading(true);
    try {
      const res = await fetch(fetchUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fetchBody),
      });
      setButtonLoading(false);

      if (res.ok) {
        window.location.reload();
      }
    } catch (e) {
      console.log(`Error attempting to \`${label}\`: `, e);
      setButtonLoading(false);
    }
  };

  if (visibleForOfferStates.includes(offerState)) {
    return (
      <Button
        className={`${classes || 'border'}`}
        variant="secondary"
        onClick={form ? form.handleSubmit(onClick) : onClick}
        disabled={buttonLoading}
        size="sm"
      >
        {label}
        {buttonLoading && (
          <LoaderCircle className="ml-2 animate-spin items-center" size={20} />
        )}
      </Button>
    );
  } else {
    return undefined;
  }
}
