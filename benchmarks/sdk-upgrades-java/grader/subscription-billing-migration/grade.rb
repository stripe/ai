# EVAL_LEAK_CHECK: sdk-upgrades-java-subscription-billing-migration-f73c1831-b6af-4f3a-b1ad-e957b12027e6-grader
require_relative '../spec_helper'
require 'stripe'
require 'dotenv/load'

RSpec.describe 'SDK Upgrade - Subscription Billing Migration' do
  before(:all) do
    # Configure Stripe with newer API version
    Stripe.api_key = ENV['STRIPE_SECRET_KEY']
    Stripe.api_version = '2025-03-31.basil'
    
    # Create test data
    puts "Creating test data for subscription-billing-migration..."
    
    # Create product and price
    product = Stripe::Product.create({ name: 'Test Product' })
    price = Stripe::Price.create({
      product: product.id,
      currency: 'usd',
      unit_amount: 1000,
      recurring: { interval: 'month' }
    })
    
    # Create customer
    customer = Stripe::Customer.create({ email: 'test@example.com' })
    @customer_id = customer.id
    
    # Attach payment method
    payment_method = Stripe::PaymentMethod.create({
      type: 'card',
      card: { token: 'tok_visa' }
    })
    Stripe::PaymentMethod.attach(payment_method.id, { customer: customer.id })
    Stripe::Customer.update(customer.id, {
      invoice_settings: { default_payment_method: payment_method.id }
    })
    
    # Create 2 active subscriptions
    subscription1 = Stripe::Subscription.create({
      customer: customer.id,
      items: [{ price: price.id }]
    })
    @subscription_id = subscription1.id
    
    subscription2 = Stripe::Subscription.create({
      customer: customer.id,
      items: [{ price: price.id }]
    })
    
    # Create 1 canceled subscription
    subscription3 = Stripe::Subscription.create({
      customer: customer.id,
      items: [{ price: price.id }]
    })
    Stripe::Subscription.cancel(subscription3.id)
    
    # Store expected counts
    @expected_active_count = 2
    @expected_canceled_count = 1
    @expected_total_count = 3
    
    puts "Created customer #{@customer_id} with 2 active and 1 canceled subscription"
    
    # Wait a moment for all subscriptions to be fully created
    sleep 2
  end

  describe 'sdk version check passes' do
    it 'had to pass for these tests to run' do
      # automatically pass
      expect(true).to be_truthy
    end
  end

  describe 'GET /subscription-summary' do
    it 'correctly retrieves current period start and end' do
      response = make_request("/subscription-summary?subscription_id=#{@subscription_id}", 'GET')
      
      expect(response.code).to eq('200')
      body = JSON.parse(response.body)
      
      # Verify response structure
      expect(body['subscriptionId']).to eq(@subscription_id)
      expect(body['status']).to be_a(String)
      expect(body['customerId']).to eq(@customer_id)
      
      # Verify billing period fields exist and are valid
      expect(body['currentPeriodStart']).to be_a(Integer)
      expect(body['currentPeriodEnd']).to be_a(Integer)
      expect(body['currentPeriodEnd']).to be > body['currentPeriodStart'],
        "Period end (#{body['currentPeriodEnd']}) should be after period start (#{body['currentPeriodStart']})"
    end
  end

  describe 'GET /active-subscriptions' do
    it 'correctly lists active subscriptions for a customer' do
      response = make_request("/active-subscriptions?customer_id=#{@customer_id}", 'GET')
      
      expect(response.code).to eq('200')
      body = JSON.parse(response.body)
      
      # Verify response structure
      expect(body['activeSubscriptions']).to be_an(Array)
      expect(body['totalCount']).to be_a(Integer)
      
      # Verify exact count matches expected active subscriptions
      expect(body['activeSubscriptions'].length).to eq(@expected_active_count),
        "Expected #{@expected_active_count} active subscriptions, got #{body['activeSubscriptions'].length}"
      
      # Verify subscription structure
      subscription = body['activeSubscriptions'].first
      expect(subscription['id']).to match(/^sub_/)
      expect(subscription['status']).to eq('active')
      
      # Verify billing period in subscription (currentPeriodEnd at root level)
      expect(subscription['currentPeriodEnd']).to be_a(Integer)
    end
  end

  describe 'POST /subscription-metrics' do
    it 'returns subscription metrics for a customer' do
      response = make_request('/subscription-metrics', 'POST', {
        customer_id: @customer_id
      })
      
      expect(response.code).to eq('200')
      body = JSON.parse(response.body)
      
      # Verify response structure
      expect(body['metrics']).to be_a(Hash)
      expect(body['metrics']['active']).to be_a(Integer)
      expect(body['metrics']['pastDue']).to be_a(Integer)
      expect(body['metrics']['canceled']).to be_a(Integer)
      expect(body['totalSubscriptions']).to be_a(Integer)
      
      # Verify exact counts match expected values
      expect(body['metrics']['active']).to eq(@expected_active_count),
        "Expected #{@expected_active_count} active subscriptions, got #{body['metrics']['active']}"
      
      expect(body['metrics']['canceled']).to eq(@expected_canceled_count),
        "Expected #{@expected_canceled_count} canceled subscriptions, got #{body['metrics']['canceled']}"
      
      expect(body['metrics']['pastDue']).to eq(0),
        "Expected 0 past_due subscriptions, got #{body['metrics']['pastDue']}"
      
      expect(body['totalSubscriptions']).to eq(@expected_total_count),
        "Expected #{@expected_total_count} total subscriptions, got #{body['totalSubscriptions']}"
      
      # Verify total equals sum of individual counts
      expected_sum = body['metrics']['active'] + body['metrics']['pastDue'] + body['metrics']['canceled']
      expect(body['totalSubscriptions']).to eq(expected_sum),
        "Total subscriptions (#{body['totalSubscriptions']}) should equal sum of counts (#{expected_sum})"
    end
  end
end

