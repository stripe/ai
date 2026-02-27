import {Stripe} from 'stripe';
import {authOptions} from '@/lib/auth';
import {stripe} from '@/lib/stripe';
import {getServerSession} from 'next-auth';

const merchantIssueResource = Stripe.StripeResource.extend({
  create: Stripe.StripeResource.method({
    method: 'POST',
    path: '/test_helpers/demo/merchant_issue',
  }) as (...args: any[]) => Promise<Stripe.Response<object>>,
});

/**
 * Generates test intervention for the logged-in salon. This is only used for testing purposes
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    const accountId = session?.user.stripeAccount.id;

    const interventionResource = new merchantIssueResource(stripe);
    const interventionResponse = await interventionResource.create({
      account: accountId,
      issue_type: 'additional_info',
    });

    console.log('Created interventionResponse!', interventionResponse);

    return new Response('Success', {
      status: 200,
      headers: {'Content-Type': 'application/json'},
    });
  } catch (error: any) {
    console.error(
      'An error occurred when calling the Stripe API to create a risk intervention',
      error
    );
    return new Response(error.message, {status: 500});
  }
}
