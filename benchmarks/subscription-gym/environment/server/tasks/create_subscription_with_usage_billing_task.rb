# frozen_string_literal: true

CREATE_SUBSCRIPTION_WITH_USAGE_BILLING = {
  preconditions: [
    {
      name: 'price',
      path: '/v1/prices/{{charging_usage_monthly}}',
      method: 'GET',
      params: {}
    },
    {
      name: 'meter',
      path: '/v1/billing/meters/${price.recurring.meter}',
      method: 'GET',
      params: {}
    },
    {
      name: 'test_clock',
      path: '/v1/test_helpers/test_clocks',
      method: 'POST',
      params: {
        frozen_time: '{{YYYY-MM-01}}', # 1st of the month
        name: 'Test clock - create subscription with usage billing'
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
    }
  ],
  challenge: {
    name: 'Create car charging subscription with usage billing',
    description: 'Create a subscription for car charging fees based on usage using meter events with the following specifications:
      1. Billing Amount: The subscription should be billed monthly at a rate of $0.45 per kilowatt-hour (kWh) based on usage.
      2. Immediate Access: Customers must be able to subscribe and gain access to the service immediately.
      3. Payment Management: Ensure effective handling of any issues related to incomplete payments.
      4. Trial: No trial period should be offered with this subscription.
      5. Discounts: No discounts will be applied to the subscription fee.
      6. Meter Usage: Customer charges their cars 4 times per month, with each charging event at 25,000 watts.
    ',
    api_contract: {
      input: {
        price_id: '${price.id}',
        customer_id: '${customer.id}',
        meter: {
          event_name: '${meter.event_name}',
          customer_mapping: {
            event_payload_key: 'stripe_customer_id'
          },
          value_settings: {
            event_payload_key: 'watt_hour'
          }
        }
      },
      output: {
        subscription_id: 'sub_xxx'
      }
    }
  }
}.freeze
