# frozen_string_literal: true

require_relative './spec_helper.rb'
require_relative './../environment/server/products.rb'

PRODUCT_CATALOG = SubscriptionGym::Products.retrieve_catalog

RSpec.describe 'Create subscription with trial' do
  # Solution
  # curl https://api.stripe.com/v1/subscriptions \
  #   -u "sk_xxx" \
  #   -d "customer"="{{customer_id}}" \
  #   -d "items[0][price]"="{{price_id}}" \
  #   -d "items[0][quantity]"="1" \
  #   -d "trial_period_days"="14" \
  #   -d "expand[0]"="pending_setup_intent"
  it 'Grader - Create subscription with trial' do
    response = post_json(
      '/run-task',
      {
        challenge: 'create_subscription_with_trial'
      }
    )

    subscription_id = response['subscription_id']
    client_secret = response['client_secret']
    expect(subscription_id).not_to be_nil
    expect(client_secret).not_to be_nil

    subscription, test_clock = retrieve_subscription(subscription_id)
    expect(subscription).not_to be_nil
    expect(test_clock).not_to be_nil

    current_frozen_time = Time.at(test_clock.frozen_time).utc
    trial_end_date = current_frozen_time + (14 * 24 * 60 * 60) # 14 days in seconds

    # Verify the subscription is created correctly
    expect(subscription.status).to eq('trialing')
    expect(subscription.items.data.length).to eq(1)
    expect(subscription.items.data[0].price.id).to eq(PRODUCT_CATALOG['unlimited_home_club_monthly'])
    expect(subscription.items.data[0].quantity).to eq(1)
    expect(subscription.trial_end).to eq(trial_end_date.to_i)
    expect(subscription.discounts).to be_empty

    # Verify the invoice is created correctly
    latest_invoice = subscription.latest_invoice
    expect(latest_invoice.amount_due).to eq(0)

    # Verify the pending setup intent is created correctly
    expect(client_secret).to eq(subscription.pending_setup_intent.client_secret)
  end
end
