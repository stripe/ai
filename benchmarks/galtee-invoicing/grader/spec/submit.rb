# frozen_string_literal: true
# EVAL_LEAK_CHECK: galtee-invoicing-989ed5c1-54cd-4f29-8728-f022c20aaa63-grader

require_relative './spec_helper.rb'
require 'dotenv'
require 'stripe'
require 'csv'

Dotenv.load('../environment/server/.env')

Stripe.api_key = ENV['STRIPE_SECRET_KEY']
Stripe.api_version = '2025-07-30.basil'

RSpec.describe 'Galtee Invoicing test integration' do
  describe 'step 1: product migration and basic routes' do
    it 'serves the products route' do
      response, _ = get_json('/products')

      expected =
        {
          'fr_hike' => {
            'eur' => 32_500,
            'usd' => 35_000,
            'gbp' => 30_000
          },
          'gb_hike' => {
            'eur' => 24_000,
            'gbp' => 20_000
          },
          'painters_way' => {
            'eur' => 100_000,
            'usd' => 120_000
          }
        }

      response.each do |product|
        id = product['id']
        prices = product['prices']
        stripe_product_id = product['stripe_product_id']
        expect(prices).not_to be_nil
        prices.each do |currency, amount|
          expect(expected[id][currency]).to eq(amount)
        end

        # Check stripe product exists
        stripe_product = Stripe::Product.retrieve(stripe_product_id)
        expect(stripe_product).not_to be_nil
      end
    end

    it 'serves purchases for test users' do
      # expected purchases from csv migration
      resp, _ = get_json('/customer/hiker+test@stripe.com/bookings')

      # print response for debugging
      puts " Response to /customer/hiker+test@stripe.com/bookings: #{resp}"

      purchase = resp.first
      expect(purchase['product_id']).to eq('fr_hike')
      expect(purchase['amount_paid']).to eq(32_500)
      expect(purchase['currency']).to eq('eur')
      expect(purchase['status']).to eq('complete')

      invoice_id = purchase['stripe_invoice_id']
      expect(invoice_id).not_to be_nil
      invoice = Stripe::Invoice.retrieve(invoice_id)
      expect(invoice.status).to eq('paid')

      resp, _ = get_json('/customer/walker+move@stripe.com/bookings')
      purchase = resp.first

      # print response for debugging
      puts "Response to /customer/walker+move@stripe.com/bookings: #{resp}"

      expect(purchase['product_id']).to eq('fr_hike')
      expect(purchase['amount_paid']).to eq(0)
      expect(purchase['status']).to eq('incomplete')

      # stripe invoice should exist but be open
      invoice_id = purchase['stripe_invoice_id']
      expect(invoice_id).not_to be_nil
      invoice = Stripe::Invoice.retrieve(invoice_id)
      expect(invoice.status).to eq('open'), "Invoice ID: #{invoice.id}"

    end
  end

  describe 'step 2: invoice creation' do
    it 'creates an invoice for a web purchase with valid payment method' do
      unique_email = "hiker+test+#{SecureRandom.hex}@stripe.com"
      resp, status = post_json('/purchase', {
                  'product' => 'gb_hike',
                  'amount' => 20_000,
                  'currency' => 'gbp',
                  'email' => unique_email,
                  'payment_method' => 'tok_visa'
                })

      puts "Response: #{resp}"

      expect(status).to eq(200)

      # Fetch the most recent booking for the user
      resp, _ = get_json("/customer/#{unique_email}/bookings")

      puts "Response to /customer/#{unique_email}/bookings: #{resp}"
      expect(resp.size).to eq(1)
      booking = resp.first
      expect(booking['product_id']).to eq('gb_hike')
      expect(booking['amount_paid']).to eq(20_000)
      expect(booking['currency']).to eq('gbp')
      expect(booking['status']).to eq('complete')
      invoice_id = booking['stripe_invoice_id']

      # log response for debugging
      puts "Booking response: #{booking}"

      # Fetch the invoice from Stripe
      invoice = Stripe::Invoice.retrieve(invoice_id)
      expect(invoice.status).to eq('paid')
      expect(invoice.amount_paid).to eq(20_000)
      expect(invoice.currency).to eq('gbp')

      # Fetch the payment intent from the booking
      payment_intent = Stripe::PaymentIntent.retrieve(booking['stripe_transaction_id'])
      expect(payment_intent.status).to eq('succeeded')
      expect(payment_intent.amount_received).to eq(20_000)
      expect(payment_intent.currency).to eq('gbp')
    end

    it 'does not create a booking for a web purchase with invalid payment method' do
      unique_email = "hiker+test+#{SecureRandom.hex}@stripe.com"
      resp, _ = post_json('/purchase', {
                  'product' => 'gb_hike',
                  'amount' => 20_000,
                  'currency' => 'gbp',
                  'email' => unique_email,
                  'payment_method' => 'tok_visa_chargeDeclinedLostCard'
                })

      puts "Response to /purchase: #{resp}"

      resp, _ = get_json("/customer/#{unique_email}/bookings")

      puts "Response to /customer/#{unique_email}/bookings: #{resp}"
      expect(resp.size).to eq(0)
    end

    it 'creates a booking but does not charge for 0 amount purchases' do
      unique_email = "hiker+test+#{SecureRandom.hex}@stripe.com"
      post_json('/purchase', {
                  'product' => 'gb_hike',
                  'amount' => 0,
                  'currency' => 'gbp',
                  'email' => unique_email,
                  'payment_method' => 'tok_visa'
                })

      resp, _ = get_json("/customer/#{unique_email}/bookings")

      puts "Response to /customer/#{unique_email}/bookings: #{resp}"
      expect(resp.size).to eq(1)
      booking = resp.first
      expect(booking['product_id']).to eq('gb_hike')
      expect(booking['amount_paid']).to eq(0)
      expect(booking['currency']).to eq('gbp')
      expect(booking['status']).to eq('incomplete')

      # Check that no transaction is set, but invoice is created and should not be paid
      expect(booking['stripe_transaction_id']).to be_nil
      invoice_id = booking['stripe_invoice_id']

      invoice = Stripe::Invoice.retrieve(invoice_id)
      expect(invoice.status).to eq('open'), "Invoice ID: #{invoice.id}"
      expect(invoice.amount_paid).to eq(0)
      expect(invoice.currency).to eq('gbp')
      expect(invoice.amount_remaining).to eq(20_000)
    end
  end
end
