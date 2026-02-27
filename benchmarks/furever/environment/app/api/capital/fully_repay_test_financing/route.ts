import {getServerSession} from 'next-auth/next';
import {authOptions} from '@/lib/auth';
import {stripe} from '@/lib/stripe';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    const connected_account = session!.user.stripeAccount.id;
    const offer = (
      await stripe.capital.financingOffers.list({connected_account, limit: 1})
    ).data
      .filter((o) => o.status === 'paid_out')
      .at(0);

    if (offer === undefined) {
      throw Error(
        'Unable to find offer with status `paid_out` for connected account: ' +
          connected_account
      );
    }

    await stripe.rawRequest(
      'POST',
      `/v1/capital/financing_offers/${offer!.id}/fully_repay`,
      {}
    );

    return new Response(
      JSON.stringify({
        offer,
      }),
      {status: 200, headers: {'Content-Type': 'application/json'}}
    );
  } catch (error: any) {
    console.error(
      'An error occurred when calling the Stripe API to fully repay test financing offer',
      error
    );
    return new Response(error.message, {status: 500});
  }
}
