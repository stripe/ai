'use client';

import * as React from 'react';
import {Button} from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {zodResolver} from '@hookform/resolvers/zod';
import {ControllerRenderProps, useForm} from 'react-hook-form';
import {z} from 'zod';
import {useRouter} from 'next/navigation';
import {LoaderCircle} from 'lucide-react';

const formSchema = z.object({
  amount: z.string(),
  currency: z.string(),
});

type Currency =
  | '_default'
  | 'aed'
  | 'aud'
  | 'cad'
  | 'cny'
  | 'eur'
  | 'gbp'
  | 'inr'
  | 'jpy'
  | 'sgd'
  | 'usd';
const CurrencyOptions: Record<Currency, string> = {
  _default: 'Default',
  aed: 'AED',
  aud: 'AUD',
  cad: 'CAD',
  cny: 'CNY',
  eur: 'EUR',
  gbp: 'GBP',
  inr: 'INR',
  jpy: 'JPY',
  sgd: 'SGD',
  usd: 'USD',
};

function CurrencySelect({
  field,
}: {
  field: ControllerRenderProps<z.infer<typeof formSchema>, 'currency'>;
}) {
  return (
    <Select {...field} onValueChange={(value) => field.onChange(value)}>
      <SelectTrigger className="mt-1">
        <SelectValue>{CurrencyOptions[field.value as Currency]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.keys(CurrencyOptions).map((key) => (
          <SelectItem key={key} value={key}>
            {CurrencyOptions[key as Currency]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function CreateCheckoutSessionButton({
  classes,
}: {
  classes?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: '',
      currency: '_default',
    },
  });

  const [loading, setLoading] = React.useState(false);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    console.log('creating checkout session with data: ', values);
    const data = {
      amount: values.amount,
      currency: values.currency,
    };

    const response = await fetch(
      '/api/payment_method_settings/create_checkout_session',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      // Handle errors on the client side here
      const {error} = await response.json();
      console.warn('An error occurred: ', error);
      return undefined;
    } else {
      const json = await response.json();

      const redirectUrl = json?.checkoutSessionResponse?.url;

      // Redirect to Checkout
      if (redirectUrl) {
        window.location.href = redirectUrl;
      }

      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className={`${classes || 'border'}`} variant="ghost" size="sm">
          Create test Checkout Session
        </Button>
      </DialogTrigger>
      <DialogContent className="p-4 text-primary sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create test Checkout Session</DialogTitle>
          <DialogDescription>
            Simulate a grooming payment by creating a{' '}
            <a
              target="blank"
              className="font-medium text-accent"
              href="https://stripe.com/docs/api/checkout/sessions"
            >
              Checkout Session
            </a>
            .
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({field}) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2">
                        $
                      </div>
                      <Input
                        {...field}
                        placeholder="Leave blank for a random amount"
                        className="pl-7"
                        type="number"
                        step="0.01"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currency"
              render={({field}) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <FormControl>
                    <CurrencySelect field={field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flew-row flex justify-end space-x-2">
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </DialogClose>
              <Button variant="default" type="submit" disabled={loading}>
                Launch Checkout Session{' '}
                {loading && (
                  <LoaderCircle
                    className="ml-2 animate-spin items-center"
                    size={20}
                  />
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
