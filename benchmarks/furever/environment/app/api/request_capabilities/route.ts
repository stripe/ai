import {authOptions} from '@/lib/auth';
import {stripe} from '@/lib/stripe';
import {getServerSession} from 'next-auth';
import {NextRequest} from 'next/server';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new Response('Unauthorized', {status: 401});
  }
  const accountId = session?.user.stripeAccount.id;
  const json = await req.json();
  const {capabilities} = json;

  try {
    await stripe.accounts.update(accountId, {
      capabilities,
    });

    // If the user requested Treasury, create a financial account if none exists
    if (capabilities.treasury?.requested) {
      const financialAccounts = await stripe.treasury.financialAccounts.list(
        {
          limit: 1,
        },
        {
          stripeAccount: accountId,
        }
      );

      if (financialAccounts.data.length === 0) {
        await stripe.treasury.financialAccounts.create(
          {
            supported_currencies: ['usd'],
            features: {
              card_issuing: {requested: true},
              deposit_insurance: {requested: true},
              financial_addresses: {aba: {requested: true}},
              inbound_transfers: {ach: {requested: true}},
              intra_stripe_flows: {requested: true},
              outbound_payments: {
                ach: {requested: true},
                us_domestic_wire: {requested: true},
              },
              outbound_transfers: {
                ach: {requested: true},
                us_domestic_wire: {requested: true},
              },
            },
          },
          {stripeAccount: accountId}
        );
      }
    }

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
