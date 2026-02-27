# frozen_string_literal: true
# EVAL_LEAK_CHECK: galtee-basic-bc7bed61-a10c-4ac1-88bf-df795375dfe8-grader
require_relative './spec_helper.rb'
require 'dotenv'
require 'stripe'
require 'csv'

Dotenv.load(File.expand_path('../../environment/server/.env', __dir__))

# Get the directory of the current file
current_dir = __dir__

# Set up Stripe API key
Stripe.api_key = ENV['STRIPE_SECRET_KEY']

RSpec.describe 'Galtee test integration' do
  it 'Works with test purchases' do
    expected_bookings = [
      {
        'product' => 'fr_hike',
        'amount' => 32_500,
        'currency' => 'eur',
        'email' => 'hiker+submit_fr_dfa34f29c88e@stripe.com',
        'payment_method' => 'pm_card_visa_cartesBancaires',
      },
      {
        'product' => 'gb_hike',
        'amount' => 20_000,
        'currency' => 'gbp',
        'email' => 'hiker+submit_gb6da6d72a7ea2@stripe.com',
        'payment_method' => 'pm_card_mastercard_debit',
      },
      {
        'product' => 'painters_way',
        'amount' => 15_000,
        'currency' => 'eur',
        'email' => 'hiker+submit_painters_way_f84905489911@stripe.com',
        'payment_method' => 'pm_card_us',
      }
    ]

    expected_bookings.each do |payment|
      resp = post_json('/purchase', payment)
      expect(resp).not_to be_nil
    end

    # Parse database
    table_name = 'bookings'
    output_path = './output.csv'

    # Parse database
    db_path = File.expand_path('../../environment/db/galtee_data.db', current_dir)
    table_name = 'bookings'
    output_path = File.expand_path(output_path, current_dir)

    system("sqlite3 #{db_path} -header -csv 'SELECT * FROM #{table_name};' > #{output_path}")
    expect(File.exist?(output_path)).to be true

    # Get customer and stripe_transaction_id columns from the CSV for expected_bookings
    csv_data = CSV.read(output_path, headers: true)
    expected_bookings.each do |payment|
      row = csv_data.find { |r| r['customer'] == payment['email'] }
      expect(row).not_to be_nil

      # Fetch payment_intent from Stripe
      payment_intent = Stripe::PaymentIntent.retrieve(row['stripe_transaction_id'])
      expect(payment_intent).not_to be_nil
      expect(payment_intent.amount_received).to eq(payment['amount'])
    end
  end

  it 'handles card declines' do
    body, status = post_json('/purchase', {
      'product' => 'fr_hike',
      'amount' => 32_500,
      'email' => 'hiker+submit@stripe.com',
      'payment_method' => 'pm_card_visa_chargeDeclinedLostCard'
    })

    expect(body['error']['code']).to eq('card_declined')

    body, status = post_json('/purchase', {
      'product' => 'fr_hike',
      'amount' => 32_500,
      'email' => 'hiker+submit@stripe.com',
      'payment_method' => 'pm_card_visa_chargeDeclinedVelocityLimitExceeded'
    })

    expect(body['error']['code']).to eq('card_declined')
  end
end
