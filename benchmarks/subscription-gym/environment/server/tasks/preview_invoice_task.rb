# frozen_string_literal: true

PREVIEW_INVOICE = {
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
        frozen_time: '{{YYYY-MM-10}}' # 10th of the month
      }
    }
  ],
  challenge: {
    name: 'Preview invoice',
    description: 'Preview the invoice details for the proration amount before the actual subscription upgrade. This will allow the customer to see the amount they need to pay if they decide to upgrade. The requirements are:
      1. Proration: Calculate proration for the upgrade and provide a preview of the invoice that will be updated at 9am UTC on the 20th of this month.
      2. Billing Cycle: Maintain the same billing period and keep the current billing date unchanged.
      3. No Subscription Update: Ensure that the subscription is not updated at this stage.
      4. No Invoice Creation: No actual invoice should be created at this point.
    ',
    api_contract: {
      input: {
        customer_id: '${customer.id}',
        subscription_id: '${subscription.id}',
        old_price_id: '${home_club_price.id}',
        new_price_id: '${all_club_price.id}'
      },
      output: {
        full_upcoming_invoice_object: {
          id: 'upcoming_in_xxx',
          object: 'invoice'
        }
      }
    }
  }
}.freeze
