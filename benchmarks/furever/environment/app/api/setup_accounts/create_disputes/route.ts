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
      },
      {
        stripeAccount: accountId,
      }
    );
    return new Response('Success', {
      status: 200,
      headers: {'Content-Type': 'application/json'},
    });
  } catch (error: any) {
    console.error(
      'An error occurred when calling the Stripe API to create payouts',
      error
    );
    return new Response(error.message, {status: 500});
  }
}
