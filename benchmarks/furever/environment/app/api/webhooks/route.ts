import {type NextRequest} from 'next/server';
import {NextResponse} from 'next/server';
import {stripe} from '@/lib/stripe';

export async function POST(req: NextRequest) {
  const body = await req.text();

  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json(
      {error: 'Cannot find the webhook signature'},
      {status: 400}
    );
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      {error: 'Cannot find the webhook secret'},
      {status: 400}
    );
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err: any) {
    return NextResponse.json(
      {error: `Webhook Error: ${err.message}`},
      {status: 400}
    );
  }

  // Handle events - see full event list: https://docs.stripe.com/api/events/types
  switch (event.type) {
    case 'account.updated':
      break;
    default:
      console.log('Unhandled event type', event.type);
      break;
  }

  return NextResponse.json({});
}
