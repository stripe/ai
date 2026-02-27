import Salon from '@/app/models/salon';
import {authOptions} from '@/lib/auth';
import {stripe} from '@/lib/stripe';
import {getServerSession} from 'next-auth';

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    const accountId = session?.user.stripeAccount.id;
    while (true) {
      const acc = await stripe.accounts.retrieve({stripeAccount: accountId});
      if (
        acc.requirements?.disabled_reason !==
        'requirements.pending_verification'
      ) {
        break;
      }
    }

    const charges = await stripe.charges.list(
      {
        limit: 1,
      },
      {
        stripeAccount: session?.user?.stripeAccount?.id,
      }
    );
    const chargeCount = charges.data.length;
    if (chargeCount > 0) {
      return new Response('Already setup', {status: 200});
    }

    // TODO: remove this section and have the llm do it
    for (let i = 0; i < 10; i++) {
      await stripe.paymentIntents.create(
        {
          amount: getRandomInt(5000, 200000),
          currency: 'usd',
          automatic_payment_methods: {
            enabled: true,
            allow_redirects: 'never',
          },
          confirm: true,
          payment_method: 'pm_card_bypassPending',
          description: 'Classic wash and groom',
          receipt_email: 'receipt_test@stripe.com',
        },
        {
          stripeAccount: accountId,
        }
      );
    }
    await stripe.paymentIntents.create(
      {
        amount: getRandomInt(5000, 20000),
        currency: 'usd',
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
        confirm: true,
        payment_method: 'pm_card_createDispute',
        receipt_email: 'dispute_test@stripe.com',
      },
      {
        stripeAccount: accountId,
      }
    );
    for (let i = 0; i < 3; i++) {
      await stripe.payouts.create(
        {
          amount: getRandomInt(5000, 20000),
          currency: 'USD',
          description: 'TEST PAYOUT',
        },
        {
          stripeAccount: accountId,
        }
      );
    }
    const update = {
      setup: true,
    };
    console.log('updating account with, ', update);

    await Salon.findOneAndUpdate({email: session?.user?.email}, update);

    return new Response('Success', {
      status: 200,
      headers: {'Content-Type': 'application/json'},
    });
  } catch (error: any) {
    console.error(
      'An error occurred when calling the Stripe API to create a checkout session',
      error
    );
    return new Response(error.message, {status: 500});
  }
}
