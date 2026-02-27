# frozen_string_literal: true

require_relative './spec_helper.rb'
require_relative './../environment/server/products.rb'

PRODUCT_CATALOG = SubscriptionGym::Products.retrieve_catalog

RSpec.describe 'Preview invoice' do
  # Solution
  # curl https://api.stripe.com/v1/invoices/create_preview \
  #   -u "sk_xxx" \
  #   -d "customer"="{{customer_id}}" \
  #   -d "subscription"="{{subscription_id}}" \
  #   -d "subscription_details[items][0][id]"="si_xxx" \
  #   -d "subscription_details[items][0][price]"="{{new_price_id}}" \
  #   -d "subscription_details[items][0][quantity]"="1" \
  #   -d "subscription_details[proration_date]"="{{YYYY-MM-20}}" \
  #   -d "subscription_details[proration_behavior]"="always_invoice"
  it 'Grader - Preview invoice' do
    response = post_json(
      '/run-task',
      {
        challenge: 'preview_invoice'
      }
    )

    upcoming_invoice = response['full_upcoming_invoice_object']
    expect(upcoming_invoice).not_to be_nil
    expect(upcoming_invoice['id']).not_to be_nil
    expect(upcoming_invoice['object']).to eq('invoice')
    expect(upcoming_invoice['lines']['data'].length).to eq(2)
    # Note: In basil API, invoice line items use 'pricing' instead of 'price'
    expect(upcoming_invoice['lines']['data'][0]['pricing']['price_details']['price']).to eq(PRODUCT_CATALOG['unlimited_home_club_monthly'])
    expect(upcoming_invoice['lines']['data'][0]['quantity']).to eq(1)
    expect(upcoming_invoice['lines']['data'][0]['description']).to include('Unused time on Unlimited Home Club')
    expect(upcoming_invoice['lines']['data'][1]['pricing']['price_details']['price']).to eq(PRODUCT_CATALOG['unlimited_all_clubs_monthly'])
    expect(upcoming_invoice['lines']['data'][1]['quantity']).to eq(1)
    expect(upcoming_invoice['lines']['data'][1]['description']).to include('Remaining time on Unlimited All Clubs')
    expect(upcoming_invoice['amount_due']).to be < 3000
  end
end
