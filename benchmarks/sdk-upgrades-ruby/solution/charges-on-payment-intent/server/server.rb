# frozen_string_literal: true
# EVAL_LEAK_CHECK: sdk-upgrades-ruby-charges-on-payment-intent-0891efcc-7898-4eb6-9700-dd889d098897-solution
require 'dotenv'
require 'sinatra'
require 'stripe'
require 'json'

CURRENT_DIR = File.dirname(__FILE__)
Dotenv.load(File.join(CURRENT_DIR, '.env'))

set :port, 4242

Stripe.api_key = ENV['STRIPE_SECRET_KEY']
# Updated to new API version (from 2022-08-01)
Stripe.api_version = '2025-03-31.basil'

get '/config' do
  content_type 'application/json'
  {
    publishableKey: ENV['STRIPE_PUBLISHABLE_KEY']
  }.to_json
end

# Create a payment intent
post '/create-payment-intent' do
  content_type 'application/json'
  request_body = JSON.parse(request.body.read)

  begin
    payment_intent = Stripe::PaymentIntent.create({
      amount: request_body['amount'] || 2000,
      currency: 'usd',
      payment_method_types: ['card'],
      confirm: request_body['confirm'] || false
    })

    {
      clientSecret: payment_intent.client_secret,
      paymentIntentId: payment_intent.id
    }.to_json
  rescue Stripe::StripeError => e
    status 400
    { error: e.message }.to_json
  end
end

# This endpoint retrieves a payment intent and accesses its charges
# UPDATED: Use Charge.list instead of payment_intent.charges (removed in v15)
get '/payment-details' do
  content_type 'application/json'

  begin
    payment_intent_id = params[:payment_intent_id]

    # Retrieve payment intent (no longer expand charges - it's removed)
    payment_intent = Stripe::PaymentIntent.retrieve(payment_intent_id)

    # Fetch charges separately using Charge.list
    charges = Stripe::Charge.list(payment_intent: payment_intent_id)

    charges_data = charges.data.map do |charge|
      {
        id: charge.id,
        amount: charge.amount,
        status: charge.status,
        receipt_url: charge.receipt_url
      }
    end

    {
      paymentIntentId: payment_intent.id,
      status: payment_intent.status,
      amount: payment_intent.amount,
      charges: charges_data,
      chargeCount: charges.data.length
    }.to_json
  rescue Stripe::StripeError => e
    status 400
    { error: e.message }.to_json
  end
end

# UPDATED: Use Charge.list to get the latest charge
get '/latest-charge-details' do
  content_type 'application/json'

  begin
    payment_intent_id = params[:payment_intent_id]

    # Fetch charges using Charge.list and get the most recent one
    charges = Stripe::Charge.list(payment_intent: payment_intent_id, limit: 1)

    if charges.data.any?
      latest_charge = charges.data.first

      {
        chargeId: latest_charge.id,
        amount: latest_charge.amount,
        paid: latest_charge.paid,
        refunded: latest_charge.refunded,
        failureMessage: latest_charge.failure_message
      }.to_json
    else
      {
        error: 'No charges found'
      }.to_json
    end
  rescue Stripe::StripeError => e
    status 400
    { error: e.message }.to_json
  end
end

# UPDATED: Use Charge.list instead of payment_intent.charges
post '/check-payment-status' do
  content_type 'application/json'
  request_body = JSON.parse(request.body.read)

  begin
    payment_intent_id = request_body['payment_intent_id']

    payment_intent = Stripe::PaymentIntent.retrieve(payment_intent_id)

    # Fetch charges separately
    charges = Stripe::Charge.list(payment_intent: payment_intent_id)

    has_charges = charges.data.any?
    has_successful_charge = charges.data.any? { |c| c.status == 'succeeded' }

    {
      paymentIntentId: payment_intent.id,
      status: payment_intent.status,
      hasCharges: has_charges,
      hasSuccessfulCharge: has_successful_charge,
      totalCharges: charges.data.length
    }.to_json
  rescue Stripe::StripeError => e
    status 400
    { error: e.message }.to_json
  end
end
