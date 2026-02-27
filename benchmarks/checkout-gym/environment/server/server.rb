# frozen_string_literal: true
#
# IMPORTANT: This server must be hidden from the agent's working environment.
# The agent should only interact with it via the browser UI (localhost:4242).
# Exposing this file or evaluations.rb to the agent would leak the answers.
# checkout-gym-15d9d138-7edc-4398-9a00-ab48f840b734-solution
require 'dotenv'
require 'sinatra'
require 'stripe'

CURRENT_DIR = File.dirname(__FILE__)
Dotenv.load(File.join(CURRENT_DIR, '.env'))

require_relative './products'
require_relative './evaluations'

set :static, true
set :public_folder, File.join(CURRENT_DIR, ENV['STATIC_DIR'])
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

post '/create-checkout-session' do
  content_type 'application/json'
  request_body = JSON.parse(request.body.read)

  # Check for challenge param in body, use to select eval if present
  challenge_name = request_body['challenge']
  challenge_params = if CheckoutGym::Evaluations.valid_challenge_name?(challenge_name)
    CheckoutGym::Evaluations.get_challenge(challenge_name)
  else
    CheckoutGym::Evaluations.get_challenge('basic_payment')
  end

  session = Stripe::Checkout::Session.create({
    **challenge_params
  })

  {
    clientSecret: session.client_secret
  }.to_json
end

get '/session-status' do
  session = Stripe::Checkout::Session.retrieve(params[:session_id])

  {
    status: session.status, 
    customer_email: session.customer_details.email
  }.to_json
end

post '/webhook' do
  # You can use webhooks to receive information about asynchronous payment events.
  # For more about our webhook events check out https://stripe.com/docs/webhooks.
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
  when 'some.event'
    puts '🔔  Webhook received!'
  end

  content_type 'application/json'
  {
    status: 'success'
  }.to_json
end
