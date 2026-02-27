import {getServerSession} from 'next-auth/next';
import {authOptions} from '@/lib/auth';
import {stripe} from '@/lib/stripe';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    const financialAccounts = await stripe.treasury.financialAccounts.list(
      {
        limit: 3,
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

    return new Response(
      JSON.stringify({
        financial_account: financialAccounts.data[0].id,
      }),
      {status: 200, headers: {'Content-Type': 'application/json'}}
    );
  } catch (error: any) {
    console.error(
      'An error occurred when calling the Stripe API to create an account session',
      error
    );
    return new Response(error.message, {status: 500});
  }
}
