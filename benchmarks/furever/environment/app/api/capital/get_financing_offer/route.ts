import {getServerSession} from 'next-auth/next';
import {authOptions} from '@/lib/auth';
import {stripe} from '@/lib/stripe';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    const connected_account = session!.user.stripeAccount.id;
    const offer = (
      await stripe.capital.financingOffers.list({connected_account, limit: 1})
    ).data.at(0);

    return new Response(
      JSON.stringify({
        offer,
      }),
      {status: 200, headers: {'Content-Type': 'application/json'}}
    );
  } catch (error: any) {
    console.error(
      'An error occurred when calling the Stripe API to list financing offers',
      error
    );
    return new Response(error.message, {status: 500});
  }
}
