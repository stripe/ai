# frozen_string_literal: true

CANCEL_SUBSCRIPTION_WITHOUT_PRORATION = {
  preconditions: [
    {
      name: 'price',
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
        name: 'Test clock - cancel subscription without proration'
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
            price: '${price.id}'
          }
        ]
      }
    }
  ],
  challenge: {
    name: 'Cancel subscription without proration',
    description: 'Cancel a subscription with the following requirements:
      1. Cancel Date: The subscription should be canceled on the 9am UTC on the 20th of the current month.
      2. Proration: No proration will apply to the cancellation.
    ',
    api_contract: {
      input: {
        subscription_id: '${subscription.id}'
      },
      output: {
        subscription_id: 'sub_xxx'
      }
    }
  }
}.freeze
