# frozen_string_literal: true

CREATE_SUBSCRIPTION_WITH_TRIAL = {
  preconditions: [
    {
      name: 'price',
      path: '/v1/prices/{{unlimited_home_club_monthly}}',
      method: 'GET',
      params: {}
    },
    {
      name: 'test_clock',
      path: '/v1/test_helpers/test_clocks',
      method: 'POST',
      params: {
        frozen_time: '{{YYYY-MM-01}}', # 1st of the month
        name: 'Test clock - create subscription with trial'
      }
    },
    {
      name: 'customer',
      path: '/v1/customers',
      method: 'POST',
      params: {
        email: 'customer@example.com',
        test_clock: '${test_clock.id}'
      }
    }
  ],
  challenge: {
    name: 'Create unlimited home club subscription with trial',
    description: 'Set up an unlimited home club subscription with a free trial that meets the following criteria:
      1. Billing: The subscription should be billed monthly at a rate of $69.00.
      2. Immediate Access: Customers should be able to sign up and start their subscription immediately.
      3. Payment Management: Ensure that payment method collection is managed effectively.
      4. Trial: Offer a free trial period of 2 weeks for new subscribers.
      5. Discounts: No discounts applied to the subscription.
    ',
    api_contract: {
      input: {
        price_id: '${price.id}',
        customer_id: '${customer.id}'
      },
      output: {
        subscription_id: 'sub_xxx'
      }
    }
  }
}.freeze
