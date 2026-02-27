# frozen_string_literal: true

require_relative './spec_helper.rb'
require_relative './../environment/server/products.rb'

PRODUCT_CATALOG = SubscriptionGym::Products.retrieve_catalog

RSpec.describe 'Create subscription with discount and billing cycle anchor' do
  # Solutions
  # curl https://api.stripe.com/v1/subscriptions \
  #   -u "sk_xxx" \
  #   -d "customer"="{{customer_id}}" \
  #   -d "items[0][price]"="{{price_id}}" \
  #   -d "items[0][quantity]"="1" \
  #   -d "discount[coupon]"="{{coupon_id}}" \
  #   -d "billing_cycle_anchor"="{{next_5th_timestamp}}" \
  #   -d "payment_behavior"="default_incomplete"
  it 'Grader - Create subscription with discount and billing cycle anchor' do
    response = post_json(
      '/run-task',
      {
        challenge: 'create_subscription_with_discount_and_billing_cycle_anchor'
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
    new_year = current_frozen_time.year
    new_month = current_frozen_time.month + 1
    if new_month > 12
      new_year += (new_month - 1) / 12
      new_month = ((new_month - 1) % 12) + 1
    end

    expected_billing_date = Time.utc(new_year, new_month, 5, 9, 0, 0, 0)

    # Verify subscription is created correctly
    expect(subscription.status).to eq('incomplete')
    expect(subscription.items.data.length).to eq(1)
    expect(subscription.items.data[0].price.id).to eq(PRODUCT_CATALOG['unlimited_home_club_monthly'])
    expect(subscription.items.data[0].quantity).to eq(1)
    expect(subscription.trial_end).to be_nil
    expect(subscription.discounts.length).to eq(1)
    expect(subscription.billing_cycle_anchor).to eq(expected_billing_date.to_i)

    # Verify invoice is prorated
    expect(subscription.latest_invoice.amount_due).to be < (6900 * 0.8)

    # Verify client secret is extracted correctly
    expect(client_secret).to eq(subscription.latest_invoice.confirmation_secret.client_secret)
  end
end
