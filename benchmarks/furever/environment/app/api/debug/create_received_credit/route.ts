import {getServerSession} from 'next-auth/next';
import {authOptions} from '@/lib/auth';
import {stripe} from '@/lib/stripe';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    const financialAccounts = await stripe.treasury.financialAccounts.list(
      {
        limit: 1,
      },
      {
        stripeAccount: session?.user?.stripeAccount?.id,
      }
    );

    if (financialAccounts.data.length === 0) {
      console.error('No financial accounts found for user');
      return new Response('No financial accounts found for user', {
        status: 400,
      });
    }

    const receivedCredit =
      await stripe.testHelpers.treasury.receivedCredits.create(
        {
          amount: 1000,
          currency: 'usd',
          financial_account: financialAccounts.data[0].id,
          network: 'ach',
        },
        {
          stripeAccount: session?.user?.stripeAccount?.id,
        }
      );

    return new Response(
      JSON.stringify({
        received_credit: receivedCredit.id,
      }),
      {status: 200, headers: {'Content-Type': 'application/json'}}
    );
  } catch (error: any) {
    console.error(
      'An error occurred when calling the Stripe API to create a received credit',
      error
    );
    return new Response(error.message, {status: 500});
  }
}
