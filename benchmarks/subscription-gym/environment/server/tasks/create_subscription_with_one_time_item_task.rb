# frozen_string_literal: true

CREATE_SUBSCRIPTION_WITH_ONE_TIME_ITEM = {
  preconditions: [
    {
      name: 'recurring_price',
      path: '/v1/prices/{{unlimited_home_club_monthly}}',
      method: 'GET',
      params: {}
    },
    {
      name: 'one_time_price',
      path: '/v1/prices/{{crop_hoodie_navy}}',
      method: 'GET',
      params: {}
    }
  ],
  challenge: {
    name: 'Create unlimited home club subscription with one time purchase',
    description: 'Create a single unlimited home club subscription only with the following specifications:
      1. Subscription Fee: The subscription should be priced at $99.00 per month.
      2. One-Time Purchase: Include a one-time purchase option for a crop hoodie priced at $12.00.
      3. Trial: There should be no trial period offered with this subscription.
      4. Discounts: No discounts will be applied to the subscription.
      5. Immediate Access: Customers must have immediate access upon subscribing.
      6. Integration: There should be no separate integration for the one-time purchase. The system should support both recurring payments and one-time purchases within the same subscription.
    ',
    api_contract: {
      input: {
        recurring_price_id: '${recurring_price.id}',
        one_time_price_id: '${one_time_price.id}',
        customer_email: 'customer@example.com'
      },
      output: {
        client_secret: 'pi_xxx_secret_xxx',
        subscription_id: 'sub_xxx'
      }
    }
  }
}.freeze
