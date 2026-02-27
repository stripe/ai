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

    const balance = await stripe.balance.retrieve({
      stripeAccount: accountId,
    });

    // Find the first balance currency that can be paid out
    const selectedBalance = balance.available.find(({amount}) => amount > 0);
    if (selectedBalance) {
      const {amount, currency} = selectedBalance;
      for (let i = 0; i < 3; i++) {
        await stripe.payouts.create(
          {
            amount: getRandomInt(100, amount),
            currency: currency,
            description: 'TEST PAYOUT',
          },
          {
            stripeAccount: accountId,
          }
        );
      }
    } else {
      throw new Error(
        'You do not have any available balance to payout. Create a test payment in the "Payments" tab first with the "Successful" status to immediately add funds to your account.'
      );
    }

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
