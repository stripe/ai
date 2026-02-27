import {type NextRequest} from 'next/server';
import {getServerSession} from 'next-auth/next';
import {authOptions} from '@/lib/auth';
import {stripe} from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    const json = await req.json();

    const {demoOnboarding, locale} = json;

    let stripeAccountId = session?.user?.stripeAccount?.id;

    if (demoOnboarding !== undefined) {
      const accountId: string = (() => {
        switch (locale) {
          case 'fr-FR':
            return process.env.EXAMPLE_DEMO_ONBOARDING_ACCOUNT_FR!;
          case 'en-SG':
            // This doesn't actually have a locale. So this can never be hit
            return process.env.EXAMPLE_DEMO_ONBOARDING_ACCOUNT_SG!;
          case 'en-GB':
          // Use GB english for Hong Kong so fall through
          case 'zh-Hant-HK':
            return process.env.EXAMPLE_DEMO_ONBOARDING_ACCOUNT_HK!;
          default:
            // Ignore
            return process.env.EXAMPLE_DEMO_ONBOARDING_ACCOUNT!;
        }
      })();

      console.log(
        `Looking for the demo onboarding account ${accountId} for locale ${locale}`
      );
      const demoOnboardingAccount = await stripe.accounts.retrieve(accountId);
      if (demoOnboardingAccount) {
        console.log(
          `Using demo onboarding account: ${demoOnboardingAccount.id}`
        );
        stripeAccountId = demoOnboardingAccount.id;
      } else {
        console.log('No demo onboarding account found');
      }
    }

    if (!stripeAccountId) {
      return new Response(
        JSON.stringify({
          error: 'No Stripe account found for this user',
        }),
        {status: 400}
      );
    }

    const account = await stripe.accounts.retrieve(stripeAccountId);

    const isCustom =
      account?.controller?.stripe_dashboard?.type === 'none' &&
      account?.controller?.losses?.payments === 'application' &&
      account?.controller?.requirement_collection === 'application';

    // We can only request the components if the account has both issuing and treasury capabilities
    const hasIssuingAndTreasury = ['card_issuing', 'treasury'].every(
      (capability) =>
        Object.keys(account?.capabilities || []).includes(capability)
    );

    const issuingAndTreasuryComponents = {
      issuing_card: {
        enabled: true,
        features: {
          card_management: true,
          cardholder_management: true,
          card_spend_dispute_management: true,
          spend_control_management: true,
        },
      },
      issuing_cards_list: {
        enabled: true,
        features: {
          card_management: true,
          cardholder_management: true,
          card_spend_dispute_management: true,
          spend_control_management: true,
          disable_stripe_user_authentication: isCustom,
        },
      },
      financial_account: {
        enabled: true,
        features: {
          send_money: true,
          transfer_balance: true,
          disable_stripe_user_authentication: isCustom,
        },
      },
      financial_account_transactions: {
        enabled: true,
        features: {
          card_spend_dispute_management: true,
        },
      },
    };

    const accountSession = await stripe.accountSessions.create({
      account: stripeAccountId,
      components: {
        // SOLUTION: Add payments component with dispute_management enabled, refund_management disabled
        payments: {
          enabled: true,
          features: {
            refund_management: false,
            dispute_management: true,
            capture_payments: true,
          },
        },
        balances: {
          enabled: true,
          features: {
            instant_payouts: true,
            standard_payouts: true,
            edit_payout_schedule: true,
            disable_stripe_user_authentication: isCustom,
          },
        },
        payouts: {
          enabled: true,
          features: {
            instant_payouts: true,
            standard_payouts: true,
            edit_payout_schedule: true,
            disable_stripe_user_authentication: isCustom,
          },
        },
        // Connect
        account_management: {
          enabled: true,
          features: {
            disable_stripe_user_authentication: isCustom,
          },
        },
        account_onboarding: {
          enabled: true,
          features: {
            disable_stripe_user_authentication: isCustom,
          },
        },
        documents: {enabled: true},
        notification_banner: {
          enabled: true,
          features: {
            disable_stripe_user_authentication: isCustom,
          },
        },
        ...(hasIssuingAndTreasury ? issuingAndTreasuryComponents : {}),
        tax_settings: {
          enabled: true,
        },
        tax_registrations: {
          enabled: true,
        },
      },
    });

    return new Response(
      JSON.stringify({
        client_secret: accountSession.client_secret,
      }),
      {status: 200, headers: {'Content-Type': 'application/json'}}
    );
  } catch (error: any) {
    console.error(
      'An error occurred when calling the Stripe API to create an account session',
      error
    );
    return new Response(JSON.stringify({error: error.message}), {status: 500});
  }
}
