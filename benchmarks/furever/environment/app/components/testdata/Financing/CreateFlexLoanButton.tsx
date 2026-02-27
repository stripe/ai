import {Button} from '@/components/ui/button';
import {LoaderCircle} from 'lucide-react';
import React from 'react';
import {OfferState} from './types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {Form, FormField, FormItem, FormLabel} from '@/components/ui/form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import Stripe from 'stripe';
import {useForm} from 'react-hook-form';
import {TransitionFinancingButton} from './TransitionFinancingButton';

const SELECTABLE_OFFER_STATES_ARRAY: Array<
  Extract<
    Stripe.Capital.FinancingOfferListParams.Status,
    'delivered' | 'accepted' | 'rejected' | 'fully_repaid' | 'paid_out'
  >
> = ['delivered', 'accepted', 'rejected', 'paid_out', 'fully_repaid'] as const;

type SelectableOfferStates = (typeof SELECTABLE_OFFER_STATES_ARRAY)[0];

const enumValueToSentenceCase = (value: String) => {
  const words = value.split('_');
  words[0] = words[0].at(0)?.toUpperCase() + words[0].substring(1);
  return words.join(' ');
};

export function CreateFlexLoanButton({
  classes,
  offerState: existingOfferState,
  visibleForOfferStates,
}: Omit<
  React.ComponentProps<typeof TransitionFinancingButton>,
  'label' | 'fetchUrl'
>) {
  const [buttonLoading, setButtonLoading] = React.useState(false);
  const [financingState, setFinancingState] =
    React.useState<SelectableOfferStates>('delivered');

  const form = useForm<{financingStateFieldValue: SelectableOfferStates}>({});

  if (visibleForOfferStates.includes(existingOfferState)) {
    return (
      <>
        <div className="flex items-center text-sm font-bold text-primary">
          Create flex loan
        </div>

        <Form {...form}>
          <FormField
            control={form.control}
            name="financingStateFieldValue"
            render={({field}) => (
              <FormItem
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  flexDirection: 'row',
                }}
              >
                <FormLabel style={{flexGrow: 1}}>Offer state</FormLabel>
                <Select
                  {...field}
                  onValueChange={(val) => setFinancingState(val as any)}
                  defaultValue={financingState}
                >
                  <SelectTrigger
                    className="w-[162px] text-xs"
                    disabled={buttonLoading}
                  >
                    <SelectValue className="text-xs">
                      {enumValueToSentenceCase(financingState)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="z-[130] text-xs">
                    {SELECTABLE_OFFER_STATES_ARRAY.map((offerState) => (
                      <SelectItem
                        value={offerState}
                        key={offerState}
                        className="z-[130] text-xs"
                      >
                        {enumValueToSentenceCase(offerState)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
          <TransitionFinancingButton
            label={'Create'}
            fetchUrl="/api/capital/create_test_financing"
            visibleForOfferStates={visibleForOfferStates}
            offerState={existingOfferState}
            fetchBody={{
              offerState: financingState,
            }}
            form={form}
          />
        </Form>
      </>
    );
  } else {
    return undefined;
  }
}
