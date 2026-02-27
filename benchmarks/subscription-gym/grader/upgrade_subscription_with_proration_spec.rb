# frozen_string_literal: true

require_relative './spec_helper.rb'
require_relative './../environment/server/products.rb'

PRODUCT_CATALOG = SubscriptionGym::Products.retrieve_catalog

RSpec.describe 'Upgrade subscription with proration' do
  # Solution
  # curl https://api.stripe.com/v1/subscriptions/sub_xxx \
  #   -u "sk_xxx" \
  #   -d "items[0][id]"="si_xxx" \
  #   -d "items[0][price]"="{{new_price_id}}" \
  #   -d "items[0][quantity]"="1" \
  #   -d "proration_behavior"="always_invoice"
  it 'Grader - Upgrade subscription with proration' do
    response = post_json(
      '/run-task',
      {
        challenge: 'upgrade_subscription_with_proration'
      }
    )

    subscription_id = response['subscription_id']
    expect(subscription_id).not_to be_nil

    subscription, test_clock = retrieve_subscription(subscription_id)
    expect(subscription).not_to be_nil
    expect(test_clock).not_to be_nil

    # Verify the subscription is upgraded correctly
    expect(subscription.status).to eq('active')
    expect(subscription.items.data.length).to eq(1)
    expect(subscription.items.data[0].price.id).to eq(PRODUCT_CATALOG['unlimited_all_clubs_monthly'])
    expect(subscription.items.data[0].quantity).to eq(1)
    expect(subscription.trial_end).to be_nil
    expect(subscription.discounts).to be_empty

    # Verify the invoice is created with proration correctly
    latest_invoice = subscription.latest_invoice
    expect(latest_invoice.amount_due).to be < 3000
  end
end
