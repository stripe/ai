# frozen_string_literal: true

CREATE_SUBSCRIPTION_ONLY = {
  preconditions: [
    {
      name: 'price',
      path: '/v1/prices/{{unlimited_home_club_monthly}}',
      method: 'GET',
      params: {}
    }
  ],
  challenge: {
    name: 'Create unlimited home club subscription and start immediately',
    description: 'Create an unlimited home club subscription with the following specifications:
      1. Billing: The subscription should be billed monthly at a rate of $69.00.
      2. Immediate Access: Customers must be able to subscribe and gain access immediately.
      3. Payment Management: Ensure that any issues with incomplete payments are handled appropriately.
      4. Trial: There should be no trial period offered with this subscription.
      5. Discounts: No discounts should be applied to the subscription.
    ',
    api_contract: {
      input: {
        price_id: '${price.id}',
        customer_email: 'customer@example.com'
      },
      output: {
        client_secret: 'pi_xxx_secret_xxx',
        subscription_id: 'sub_xxx'
      }
    }
  }
}.freeze
