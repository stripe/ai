# frozen_string_literal: true
require 'dotenv'
require 'sinatra'
require 'stripe'

CURRENT_DIR = File.dirname(__FILE__)
Dotenv.load(File.join(CURRENT_DIR, '.env'))

require_relative './products'
require_relative './challenges'

set :port, 4242

# Configure Stripe
Stripe.api_key = ENV['STRIPE_SECRET_KEY']
Stripe.api_version = ENV['STRIPE_API_VERSION']

get '/config' do
  content_type 'application/json'
  {
    publishableKey: ENV['STRIPE_PUBLISHABLE_KEY']
  }.to_json
end

post '/run-task' do
  content_type 'application/json'
  request_body = JSON.parse(request.body.read)

  # TODO: LLM should implement this endpoint based on the challenge requirements
  # 
  # The challenge descriptions are available in ALL_SUBSCRIPTION_CHALLENGES constant
  # You can access a specific challenge like: 
  # challenge = SubscriptionGym::Challenges.get_challenge(request_body['challenge'])
  #
  # The input can be obtained from challenge[:input]
  # The output can be otained from challenge[:output]
  #
  # Expected input format:
  # {
  #   "customer_email": "customer@example.com"
  # }
  # 
  # The input format may contain pre-created Stripe object IDs.
  # {
  #   "price_id": "price_xxx",
  #   "customer_id": "cus_xxx"
  # }
  #
  # Expected output format:
  # {
  #   "subscription_id": "sub_xxx",
  #   "customer_id": "cus_xxx", 
  #   "client_secret": "pi_xxx_secret_xxx" (if payment required)
  # }
  #
  # Implementation should: read the challenge type from request_body['challenge'], get challenge details from SubscriptionGym::Challenges.get_challenge(challenge_name),
  # and create the necessary Stripe objects and return proper response format

  {
    error: "Not implemented - LLM should implement this endpoint"
  }.to_json
end

get '/subscription-status' do
  content_type 'application/json'
  
  begin
    subscription = Stripe::Subscription.retrieve(params[:subscription_id])
    
    {
      status: subscription.status,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      customer_id: subscription.customer
    }.to_json
  rescue Stripe::StripeError => e
    status 400
    {
      error: {
        message: e.message
      }
    }.to_json
  end
end

post '/webhook' do
  # Handle Stripe webhooks for subscription events
  webhook_secret = ENV['STRIPE_WEBHOOK_SECRET']
  payload = request.body.read
  
  if !webhook_secret.empty?
    # Retrieve the event by verifying the signature using the raw body and secret if webhook signing is configured.
    sig_header = request.env['HTTP_STRIPE_SIGNATURE']
    event = nil

    begin
      event = Stripe::Webhook.construct_event(
        payload, sig_header, webhook_secret
      )
    rescue JSON::ParserError => e
      # Invalid payload
      status 400
      return
    rescue Stripe::SignatureVerificationError => e
      # Invalid signature
      puts '⚠️  Webhook signature verification failed.'
      status 400
      return
    end
  else
    data = JSON.parse(payload, symbolize_names: true)
    event = Stripe::Event.construct_from(data)
  end

  case event.type
  when 'invoice.payment_succeeded'
    puts '🔔  Payment succeeded for subscription!'
  when 'invoice.payment_failed'
    puts '❌  Payment failed for subscription!'
  when 'customer.subscription.created'
    puts '🆕  New subscription created!'
  when 'customer.subscription.updated'
    puts '🔄  Subscription updated!'
  when 'customer.subscription.deleted'
    puts '🗑️  Subscription cancelled!'
  end

  content_type 'application/json'
  {
    status: 'success'
  }.to_json
end
