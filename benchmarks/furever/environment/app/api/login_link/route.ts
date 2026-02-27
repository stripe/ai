import {getServerSession} from 'next-auth/next';
import {authOptions} from '@/lib/auth';
import {stripe} from '@/lib/stripe';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    const stripeAccount = session?.user?.stripeAccount?.id;
    if (!stripeAccount) {
      console.error('No connected account found for user');
      return new Response('No connected account found for user', {
        status: 400,
      });
    }

    if (
      session.user.stripeAccount.controller?.stripe_dashboard?.type !==
      'express'
    ) {
      console.error('User does not have access to Express dashboard');
      return new Response('User does not have access to Express dashboard.', {
        status: 400,
      });
    }

    const link = await stripe.accounts.createLoginLink(stripeAccount);

    return new Response(
      JSON.stringify({
        url: link.url,
      }),
      {status: 200, headers: {'Content-Type': 'application/json'}}
    );
  } catch (error: any) {
    console.error(
      'An error occurred when calling the Stripe API to create a login link',
      error
    );
    return new Response(error.message, {status: 500});
  }
}
