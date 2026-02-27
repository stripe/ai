import Salon from '@/app/models/salon';
import {authOptions} from '@/lib/auth';
import {stripe} from '@/lib/stripe';
import {getServerSession} from 'next-auth';
import {type NextRequest} from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const accountId = session?.user.stripeAccount.id;
    const json = await req.json();

    if (!accountId) {
      throw new Error('Stripe account ID is undefined');
    }

    const {
      country,
      currency,
      account_holder_name,
      account_holder_type,
      routing_number,
      account_number,
    } = json;

    const token = await stripe.tokens.create(
      {
        bank_account: {
          country: country,
          currency: currency,
          account_holder_name: account_holder_name,
          account_holder_type: account_holder_type,
          routing_number: routing_number,
          account_number: account_number,
        },
      },
      {
        stripeAccount: accountId,
      }
    );
    if (!token) {
      throw new Error('Token was not returned');
    }
    await stripe.accounts.createExternalAccount(accountId, {
      external_account: token.id,
    });

    return new Response('Success', {
      status: 200,
      headers: {'Content-Type': 'application/json'},
    });
  } catch (error: any) {
    console.error(
      'An error occurred when calling the Stripe API to create a bank account',
      error
    );
    return new Response(error.message, {status: 500});
  }
}
