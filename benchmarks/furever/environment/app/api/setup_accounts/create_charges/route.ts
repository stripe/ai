import Salon from '@/app/models/salon';
import {authOptions} from '@/lib/auth';
import {stripe} from '@/lib/stripe';
import {getServerSession} from 'next-auth';
import {NextRequest} from 'next/server';

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
const staticCurrencyPaymentMethods = ['sepa_debit', 'ach_direct_debit'];
const getPaymentMethod = (status: string) => {
  switch (status) {
    case 'card_successful':
      return 'pm_card_bypassPending';
    case 'card_successful_intl':
      return 'pm_card_bypassPendingInternational';
    case 'card_disputed_fraudulent':
      return 'pm_card_createDispute';
    case 'card_disputed_product_not_received':
      return 'pm_card_createDisputeProductNotReceived';
    case 'card_disputed_inquiry':
      return 'pm_card_createDisputeInquiry';
    default:
      return 'pm_card_bypassPending';
  }
};

const customers = [
  {
    email: 'labradoodle@stripe.com',
    name: 'Odie',
    description: 'Full grooming package for large Labradoodle',
  },
  {
    email: 'poodle@stripe.com',
    name: 'Snoopy ',
    description: 'Nail trimming for toy Poodle',
  },
  {
    email: 'golden_retriever@stripe.com',
    name: 'Dug',
    description:
      'Hydro surge warm water shampoo & conditioner for Golden Retriever',
  },
  {
    email: 'siamese_cat@stripe.com',
    name: 'Garfield',
    description: 'Flea and tick treatments for Siamese cat',
  },
  {
    email: 'argente_rabbit@stripe.com',
    name: 'Bugs Bunny',
    description: 'Fur brushing and trimming for Argente Rabbit',
  },
];

const createPaymentIntentForNonCardPayments = async (
  status: string,
  {
    amount,
    currency,
    name,
    email,
    customerId,
    description,
    connectedAccountId,
  }: {
    amount: number;
    currency: string;
    name: string;
    email: string;
    customerId: string;
    description: string;
    connectedAccountId: string | undefined;
  }
) => {
  let paymentMethod;
  let paymentIntent;
  switch (status) {
    case 'ach_direct_debit':
      paymentMethod = await stripe.paymentMethods.create(
        {
          type: 'us_bank_account',
          billing_details: {
            address: {
              line1: '354 Oyster Point Boulevard',
              city: 'South San Francisco',
              postal_code: '94080',
              state: 'CA',
              country: 'US',
            },
            name,
            email,
          },
          us_bank_account: {
            account_holder_type: 'individual',
            account_number: '000123456789',
            routing_number: '110000000',
          },
        },
        {stripeAccount: connectedAccountId}
      );

      paymentIntent = await stripe.paymentIntents.create(
        {
          amount,
          currency,
          payment_method: paymentMethod.id,
          description,
          customer: customerId,
          statement_descriptor: process.env.APP_NAME,
          confirmation_method: 'manual',
          confirm: true,
          payment_method_types: ['us_bank_account'],
          mandate_data: {
            customer_acceptance: {
              type: 'offline',
            },
          },
        },
        {stripeAccount: connectedAccountId}
      );

      await stripe.paymentIntents.verifyMicrodeposits(
        paymentIntent.id,
        {
          descriptor_code: 'SM11AA',
        },
        {stripeAccount: connectedAccountId}
      );
      return;

    case 'sepa_debit':
      paymentMethod = await stripe.paymentMethods.create(
        {
          type: 'sepa_debit',
          billing_details: {
            address: {
              line1: '1 Grand Canal Street Lower, Grand Canal Dock',
              city: 'Dublin',
              postal_code: 'D02 H210',
              country: 'IE',
            },
            name,
            email,
          },
          sepa_debit: {
            iban: 'IE29AIBK93115212345678',
          },
        },
        {stripeAccount: connectedAccountId}
      );

      paymentIntent = await stripe.paymentIntents.create(
        {
          amount,
          currency: 'eur',
          payment_method: paymentMethod.id,
          description,
          customer: customerId,
          statement_descriptor: process.env.APP_NAME,
          confirmation_method: 'manual',
          confirm: true,
          payment_method_types: ['sepa_debit'],
          mandate_data: {
            customer_acceptance: {
              type: 'offline',
            },
          },
        },
        {stripeAccount: connectedAccountId}
      );
      return;
    default:
      return;
  }
};

export async function POST(req: NextRequest) {
  console.log('in function');
  const json = await req.json();

  const {amount: inputAmount, currency, status, count: inputCount} = json;
  console.log('Creating payments with the following parameters:', json);

  try {
    const session = await getServerSession(authOptions);
    const accountId = session?.user.stripeAccount.id;

    const count = Number(inputCount) || 1;

    await Promise.all(
      Array.from(Array(count)).map(() =>
        (async () => {
          const {name, email, description} =
            customers[Math.floor(Math.random() * customers.length)];
          console.log('creating customer', name, email, description);
          // Note: normally, you won't create a separate customer per payment - this is only done for the purposes of this demo
          const customer = await stripe.customers.create(
            {
              email,
            },
            {
              stripeAccount: accountId,
            }
          );

          const metadata = {
            amount: inputAmount
              ? Math.round(inputAmount) * 100
              : getRandomInt(1000, 10000), // Use a random amount if input is not provided,
            currency:
              !staticCurrencyPaymentMethods.includes(status) && currency
                ? currency
                : session?.user.stripeAccount.default_currency,
            name,
            email,
            customerId: customer.id,
            description,
            connectedAccountId: accountId,
          };

          if (status.startsWith('card_')) {
            console.log('creating');
            await stripe.paymentIntents.create(
              {
                amount: metadata.amount,
                currency: metadata.currency,
                payment_method: getPaymentMethod(status),
                payment_method_types: ['card'],
                description,
                customer: metadata.customerId,
                statement_descriptor: process.env.APP_NAME,
                confirmation_method: 'manual',
                confirm: true,
                ...(status === 'card_uncaptured'
                  ? {
                      capture_method: 'manual', // https://stripe.com/docs/payments/place-a-hold-on-a-payment-method
                    }
                  : {}),
              },
              {
                stripeAccount: accountId,
              }
            );
          } else {
            await createPaymentIntentForNonCardPayments(status, metadata);
          }
        })()
      )
    );

    return new Response('Success', {
      status: 200,
      headers: {'Content-Type': 'application/json'},
    });
  } catch (error: any) {
    console.error(
      'An error occurred when calling the Stripe API to create test payments',
      error
    );
    return new Response(error.message, {status: 500});
  }
}
