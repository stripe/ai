# frozen_string_literal: true

DOWNGRADE_SUBSCRIPTION_AT_END_OF_CYCLE = {
  preconditions: [
    {
      name: 'home_club_price',
      path: '/v1/prices/{{unlimited_home_club_monthly}}',
      method: 'GET',
      params: {}
    },
    {
      name: 'all_club_price',
      path: '/v1/prices/{{unlimited_all_clubs_monthly}}',
      method: 'GET',
      params: {}
    },
    {
      name: 'test_clock',
      path: '/v1/test_helpers/test_clocks',
      method: 'POST',
      params: {
        frozen_time: '{{YYYY-MM-01}}', # 1st of the month
        name: 'Test clock - downgrade subscription at end of cycle'
      }
    },
    {
      name: 'customer',
      path: '/v1/customers',
      method: 'POST',
      params: {
        email: 'customer@example.com',
        payment_method: 'pm_card_visa',
        invoice_settings: {
          default_payment_method: 'pm_card_visa'
        },
        test_clock: '${test_clock.id}'
      }
    },
    {
      name: 'subscription',
      path: '/v1/subscriptions',
      method: 'POST',
      params: {
        customer: '${customer.id}',
        default_payment_method: '${customer.invoice_settings.default_payment_method}',
        items: [
          {
            price: '${all_club_price.id}'
          }
        ]
      }
    },
    {
      name: 'test_clock',
      path: '/v1/test_helpers/test_clocks/${test_clock.id}/advance',
      method: 'POST',
      params: {
        frozen_time: '{{YYYY-MM-15}}' # 15th of the month
      }
    }
  ],
  challenge: {
    name: 'Downgrade subscription at end of cycle',
    description: 'Downgrade a subscription from the all clubs plan to the home club plan with the following requirements:
      1. New Billing Amount: The downgraded subscription should be billed monthly at a fee of $69.00.
      2. Eligibility: Customers must be able to downgrade from their existing subscription that costs $99.00 per month.
      3. Downgrade Timing: Schedule the downgrade to take effect at the end of the current billing cycle without applying proration.
    ',
    api_contract: {
      input: {
        subscription_id: '${subscription.id}',
        old_price_id: '${all_club_price.id}',
        new_price_id: '${home_club_price.id}'
      },
      output: {
        subscription_id: 'sub_xxx',
        subscription_schedule_id: 'sub_sched_xxx'
      }
    }
  }
}.freeze
