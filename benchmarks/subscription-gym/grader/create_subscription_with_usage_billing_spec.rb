# frozen_string_literal: true

require_relative './spec_helper.rb'
require_relative './../environment/server/products.rb'

PRODUCT_CATALOG = SubscriptionGym::Products.retrieve_catalog

RSpec.describe 'Create subscription with usage billing' do
  # Solutions
  # curl https://api.stripe.com/v1/subscriptions \
  #   -u "sk_xxx" \
  #   -d "customer"="{{customer_id}}" \
  #   -d "items[0][price]"="{{price_id}}" \
  #   -d "items[0][quantity]"="1"
  #
  # curl https://api.stripe.com/v1/billing/meter_events \
  #   -u "sk_xxx" \
  #   -d "event_name"="charging_meter_xxx" \
  #   -d "payload[stripe_customer_id]"="{{customer_id}}" \
  #   -d "payload[watt_hour]"="{{usage_amount}}"
  it 'Grader - Create subscription with usage billing' do
    response = post_json(
      '/run-task',
      {
        challenge: 'create_subscription_with_usage_billing'
      }
    )

    subscription_id = response['subscription_id']
    expect(subscription_id).not_to be_nil

    subscription, test_clock = retrieve_subscription(subscription_id)
    expect(subscription).not_to be_nil
    expect(test_clock).not_to be_nil

    # Verify the subscription is created correctly
    expect(subscription.status).to eq('active')
    expect(subscription.items.data.length).to eq(1)
    expect(subscription.items.data[0].price.id).to eq(PRODUCT_CATALOG['charging_usage_monthly'])
    expect(subscription.items.data[0].quantity).to be_nil
    expect(subscription.trial_end).to be_nil
    expect(subscription.discounts).to be_empty
    expect(subscription.latest_invoice.amount_due).to eq(0)

    # Advance to the end of the cycle
    # Note: In basil API, current_period_end moved to subscription item level
    advance_test_clock(test_clock.id, subscription.items.data[0].current_period_end)
    advanced_subscription, _test_clock = retrieve_subscription(subscription_id)

    # Verify the invoice includes the usage correctly
    advanced_invoice = advanced_subscription.latest_invoice
    expect(advanced_invoice.status).to eq('paid')
    expect(advanced_invoice.amount_due).to eq(4500)
    expect(advanced_invoice.lines.data.length).to eq(1)
    # Note: In basil API, invoice line items use 'pricing' instead of 'price'
    expect(advanced_invoice.lines.data[0].pricing.price_details.price).to eq(PRODUCT_CATALOG['charging_usage_monthly'])
    expect(advanced_invoice.lines.data[0].quantity).to eq(100000)
  end
end
