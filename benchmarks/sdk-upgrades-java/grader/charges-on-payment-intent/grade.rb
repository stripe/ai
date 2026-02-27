# EVAL_LEAK_CHECK: sdk-upgrades-java-charges-on-payment-intent-284c2a9a-b3ea-4767-b334-7d8b18535229-grader
require_relative '../spec_helper'
require 'stripe'
require 'dotenv/load'

RSpec.describe 'Ruby SDK Upgrade - Charges Removal' do
  before(:all) do
    # Configure Stripe
    Stripe.api_key = ENV['STRIPE_SECRET_KEY']
    
    # Create test data
    puts "Creating test payment intent with charge..."
    
    # Create and confirm a payment intent to generate a charge
    payment_intent = Stripe::PaymentIntent.create({
      amount: 2000,
      currency: 'usd',
      payment_method_types: ['card'],
      payment_method: 'pm_card_visa',
      confirm: true
    })
    
    @payment_intent_id = payment_intent.id
    
    puts "Created payment intent #{@payment_intent_id}"
    
    # Wait a moment for the charge to be created
    sleep 2
  end

  describe 'sdk version check passes' do
    it 'had to pass for these tests to run' do
      # automatically pass
      expect(true).to be_truthy
    end
  end

  describe 'POST /create-payment-intent' do
    it 'creates a payment intent and returns client secret' do
      response = make_request('/create-payment-intent', 'POST', { amount: 2000 })
      
      expect(response.code).to eq('200')
      body = JSON.parse(response.body)
      expect(body['clientSecret']).to match(/^pi_.*_secret_.*/)
      expect(body['paymentIntentId']).to match(/^pi_/)
    end
  end

  describe 'GET /payment-details' do
    it 'retrieves payment intent and returns all charges' do
      response = make_request("/payment-details?payment_intent_id=#{@payment_intent_id}", 'GET')
      
      expect(response.code).to eq('200')
      body = JSON.parse(response.body)
      
      # Verify response structure
      expect(body['paymentIntentId']).to eq(@payment_intent_id)
      expect(body['status']).to be_a(String)
      expect(body['amount']).to be_a(Integer)
      expect(body['charges']).to be_an(Array)
      expect(body['chargeCount']).to be_a(Integer)
      
      # Verify we got charge data
      if body['chargeCount'] > 0
        charge = body['charges'].first
        expect(charge['id']).to match(/^ch_/)
        expect(charge['amount']).to be_a(Integer)
        expect(charge['status']).to be_a(String)
      end
    end
  end

  describe 'GET /latest-charge-details' do
    it 'retrieves the latest charge for a payment intent' do
      response = make_request("/latest-charge-details?payment_intent_id=#{@payment_intent_id}", 'GET')
      
      expect(response.code).to eq('200')
      body = JSON.parse(response.body)
      
      # Verify response structure
      expect(body['chargeId']).to match(/^ch_/)
      expect(body['amount']).to be_a(Integer)
      expect(body).to have_key('paid')
      expect(body).to have_key('refunded')
    end
  end

  describe 'POST /check-payment-status' do
    it 'checks payment status and charge information' do
      response = make_request('/check-payment-status', 'POST', {
        payment_intent_id: @payment_intent_id
      })
      
      expect(response.code).to eq('200')
      body = JSON.parse(response.body)
      
      # Verify response structure
      expect(body['paymentIntentId']).to eq(@payment_intent_id)
      expect(body['status']).to be_a(String)
      expect(body).to have_key('hasCharges')
      expect(body).to have_key('hasSuccessfulCharge')
      expect(body['totalCharges']).to be_a(Integer)
    end
  end
end

