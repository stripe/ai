# frozen_string_literal: true

require_relative './spec_helper.rb'
require_relative './../environment/server/products.rb'

PRODUCT_CATALOG = SubscriptionGym::Products.retrieve_catalog

RSpec.describe 'Create subscription with one time item' do
  # Solution
  # curl https://api.stripe.com/v1/subscriptions \
  #   -u "sk_xxx" \
  #   -d "customer"="{{customer_id}}" \
  #   -d "items[0][price]"="{{price_id}}" \
  #   -d "items[0][quantity]"="1" \
  #   -d "add_invoice_items[0][price]"="{{one_time_price_id}}" \
  #   -d "add_invoice_items[0][quantity]"="1" \
  #   -d "payment_behavior"="default_incomplete"
  it 'Grader - Create subscription with one time item' do
    response = post_json(
      '/run-task',
      {
        challenge: 'create_subscription_with_one_time_item'
      }
    )

    subscription_id = response['subscription_id']
    client_secret = response['client_secret']
    expect(subscription_id).not_to be_nil
    expect(client_secret).not_to be_nil

    subscription, _test_clock = retrieve_subscription(subscription_id)
    expect(subscription).not_to be_nil

    # Verify the subscription is created correctly
    expect(subscription.status).to eq('incomplete')
    expect(subscription.items.data.length).to eq(1)
    expect(subscription.items.data[0].price.id).to eq(PRODUCT_CATALOG['unlimited_home_club_monthly'])
    expect(subscription.items.data[0].quantity).to eq(1)
    expect(subscription.trial_end).to be_nil
    expect(subscription.discounts).to be_empty

    # Verify the invoice is created correctly
    latest_invoice = subscription.latest_invoice
    expect(latest_invoice.amount_due).to eq(8100)
    expect(latest_invoice.lines.data.length).to eq(2)

    # Verify the customer is created correctly
    customer = retrieve_customer(subscription.customer)
    expect(customer.email).to eq('customer@example.com')

    # Verify the client secret is extracted correctly
    expect(client_secret).to eq(subscription.latest_invoice.confirmation_secret.client_secret)
  end
end
