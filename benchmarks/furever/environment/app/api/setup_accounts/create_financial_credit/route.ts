import {authOptions} from '@/lib/auth';
import {stripe} from '@/lib/stripe';
import {getServerSession} from 'next-auth';
import {NextRequest} from 'next/server';

export async function POST(req: NextRequest) {
  const json = await req.json();
  const {financialAccount} = json;
  try {
    const session = await getServerSession(authOptions);
    const accountId = session?.user.stripeAccount.id;

    await stripe.testHelpers.treasury.receivedCredits.create(
      {
        amount: 1000,
        currency: 'usd',
        financial_account: financialAccount,
        network: 'ach',
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
