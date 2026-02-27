import {getServerSession} from 'next-auth/next';
import {authOptions} from '@/lib/auth';
import {stripe} from '@/lib/stripe';
import {NextRequest} from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    const connected_account = session!.user.stripeAccount.id;

    const state = (await req.json())['offerState'] || 'delivered';

    await stripe.rawRequest('POST', '/v1/capital/financing_offers/test_mode', {
      max_premium_amount: 10000_00,
      max_advance_amount: 100000_00,
      max_withhold_rate_str: 0.15,
      is_refill: false,
      financing_type: 'flex_loan',
      state,
      is_youlend: false,
      is_fixed_term: false,
      'loan_repayment_details[repayment_interval_duration_days]': 60,
      'loan_repayment_details[target_payback_weeks]': 42,
      country: 'US',
      connected_account,
    });

    return new Response(JSON.stringify({}), {
      status: 200,
      headers: {'Content-Type': 'application/json'},
    });
  } catch (error: any) {
    console.error(
      'An error occurred when calling the Stripe API to create test financing offer',
      error
    );
    return new Response(error.message, {status: 500});
  }
}
