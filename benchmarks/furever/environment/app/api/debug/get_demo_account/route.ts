import {stripe} from '@/lib/stripe';

export async function POST() {
  try {
    // If we have a demo account in the env file, use it
    let demoAccountId: string | undefined = process.env.EXAMPLE_DEMO_ACCOUNT;
    if (!demoAccountId) {
      // Look for a demo account
      const accounts = await stripe.accounts.list({
        limit: 20,
      });
      const demoAccount = accounts.data.find((account) => {
        const metadata = account.metadata;
        if (!metadata) {
          return false;
        }

        // Get an account that is a demo account, not restricted,
        // and not high or elevated fraud, and can take charges and payouts
        return (
          metadata.demo_account === 'true' &&
          metadata.restricted !== 'true' &&
          metadata.elevated_fraud !== 'true' &&
          metadata.high_fraud !== 'true' &&
          account.charges_enabled &&
          account.payouts_enabled
        );
      });
      if (!demoAccount) {
        console.error('No demo account found');
        return new Response(
          JSON.stringify({
            error: 'No demo account found',
          }),
          {status: 400}
        );
      }
      demoAccountId = demoAccount.id;
    }

    return new Response(
      JSON.stringify({
        accountId: demoAccountId,
      }),
      {status: 200, headers: {'Content-Type': 'application/json'}}
    );
  } catch (error: any) {
    console.error(
      'An error occurred when calling the Stripe API to get a demo account',
      error
    );
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {status: 500}
    );
  }
}
