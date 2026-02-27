# frozen_string_literal: true

UPGRADE_SUBSCRIPTION_WITH_PRORATION = {
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
        name: 'Test clock - upgrade subscription with proration'
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
            price: '${home_club_price.id}'
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
    name: 'Upgrade subscription with proration',
    description: 'Upgrade a subscription from the home club plan to the all clubs plan with the following requirements:
      1. New Billing: The upgraded subscription should have a monthly fee of $99.00.
      2. Eligibility: Customers should be able to upgrade from their existing subscription that costs $69.00 per month.
      3. Proration: Implement proration for the upgrade and bill the customer immediately.
      4. Billing Cycle: Maintain the same billing period and keep the current billing date unchanged.
    ',
    api_contract: {
      input: {
        subscription_id: '${subscription.id}',
        old_price_id: '${home_club_price.id}',
        new_price_id: '${all_club_price.id}'
      },
      output: {
        customer_id: 'cus_xxx',
        subscription_id: 'sub_xxx',
        status: 'active'
      }
    }
  }
}.freeze
