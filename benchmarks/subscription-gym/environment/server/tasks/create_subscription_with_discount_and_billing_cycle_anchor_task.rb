# frozen_string_literal: true

CREATE_SUBSCRIPTION_WITH_DISCOUNT_AND_BILLING_CYCLE_ANCHOR = {
  preconditions: [
    {
      name: 'price',
      path: '/v1/prices/{{unlimited_home_club_monthly}}',
      method: 'GET',
      params: {}
    },
    {
      name: 'coupon',
      path: '/v1/coupons',
      method: 'POST',
      params: {
        name: 'Stripe coporate discount',
        percent_off: 20,
        duration: 'forever'
      }
    },
    {
      name: 'test_clock',
      path: '/v1/test_helpers/test_clocks',
      method: 'POST',
      params: {
        frozen_time: '{{YYYY-MM-10}}', # 10th of the month
        name: 'Test clock - create subscription with discount and billing cycle anchor'
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
    name: 'Create unlimited home club subscription with discount and billing cycle anchor',
    description: 'Set up an unlimited home club subscription with corporate discounts that meets the following criteria:
      1. Billing Amount: The subscription should be billed monthly at a rate of $99.00.
      2. Immediate Access: Customer must be able to sign up and access their subscription immediately.
      3. Payment Management: Effectively manage any situations involving incomplete payment statuses.
      4. Trial: No trial period should be offered with this subscription.
      5. Discounts: Apply a 20% discount on the monthly subscription fee.
      6. Billing Date: Bill the customer at 9am UTC on the 5th of every month.
    ',
    api_contract: {
      input: {
        price_id: '${price.id}',
        customer_id: '${customer.id}',
        coupon_id: '${coupon.id}'
      },
      output: {
        subscription_id: 'sub_xxx',
        client_secret: 'pi_xxx_secret_xxx'
      }
    }
  }
}.freeze
