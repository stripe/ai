# frozen_string_literal: true
# EVAL_LEAK_CHECK: subscription-gym-d1d10432-e6b5-4ac1-8a92-dd3ff4f70707-solution
require 'dotenv'
require 'sinatra'
require 'stripe'

SOLUTION_DIR = File.dirname(__FILE__)
Dotenv.load(File.join(SOLUTION_DIR, '.env'))

# Load products and challenges from environment
require_relative '../../environment/server/products'
require_relative '../../environment/server/challenges'

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

  challenge_name = request_body['challenge']

  unless SubscriptionGym::Challenges.valid_challenge_name?(challenge_name)
    status 400
    return { error: "Invalid challenge: #{challenge_name}" }.to_json
  end

  challenge = SubscriptionGym::Challenges.get_challenge(challenge_name)
  input = challenge[:api_contract][:input]

  begin
    result = case challenge_name
    when 'create_subscription_only'
      handle_create_subscription_only(input)
    when 'create_subscription_with_trial'
      handle_create_subscription_with_trial(input)
    when 'create_subscription_with_usage_billing'
      handle_create_subscription_with_usage_billing(input)
    when 'create_subscription_with_one_time_item'
      handle_create_subscription_with_one_time_item(input)
    when 'create_subscription_with_discount_and_billing_cycle_anchor'
      handle_create_subscription_with_discount_and_billing_cycle_anchor(input)
    when 'create_subscription_schedule_only'
      handle_create_subscription_schedule_only(input)
    when 'upgrade_subscription_with_proration'
      handle_upgrade_subscription_with_proration(input)
    when 'downgrade_subscription_at_end_of_cycle'
      handle_downgrade_subscription_at_end_of_cycle(input)
    when 'cancel_subscription_without_proration'
      handle_cancel_subscription_without_proration(input)
    when 'preview_invoice'
      handle_preview_invoice(input)
    else
      { error: "Challenge not implemented: #{challenge_name}" }
    end

    result.to_json
  rescue Stripe::StripeError => e
    status 400
    { error: e.message }.to_json
  rescue => e
    status 500
    { error: e.message }.to_json
  end
end

# Task 1: Create subscription only
# Creates a basic subscription with immediate billing
def handle_create_subscription_only(input)
  price_id = input[:price_id]
  customer_email = input[:customer_email]

  # Create customer
  customer = Stripe::Customer.create(email: customer_email)

  # Create subscription with default_incomplete payment behavior
  subscription = Stripe::Subscription.create(
    customer: customer.id,
    items: [{ price: price_id, quantity: 1 }],
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.confirmation_secret']
  )

  {
    subscription_id: subscription.id,
    client_secret: subscription.latest_invoice.confirmation_secret.client_secret
  }
end

# Task 2: Create subscription with trial
# Creates a subscription with a 14-day trial period
def handle_create_subscription_with_trial(input)
  price_id = input[:price_id]
  customer_id = input[:customer_id]

  # Create subscription with trial
  subscription = Stripe::Subscription.create(
    customer: customer_id,
    items: [{ price: price_id, quantity: 1 }],
    trial_period_days: 14,
    expand: ['pending_setup_intent']
  )

  {
    subscription_id: subscription.id,
    client_secret: subscription.pending_setup_intent.client_secret
  }
end

# Task 3: Create subscription with usage billing
# Creates a metered subscription and records meter events
def handle_create_subscription_with_usage_billing(input)
  price_id = input[:price_id]
  customer_id = input[:customer_id]
  meter = input[:meter]

  # Create subscription for metered usage
  subscription = Stripe::Subscription.create(
    customer: customer_id,
    items: [{ price: price_id }]
  )

  # Record 4 charging events of 25,000 watt-hours each (100,000 total = 100 kWh)
  # Stripe meter events expect string values in the payload
  Stripe::Billing::MeterEvent.create(
    event_name: meter[:event_name],
    payload: {
      stripe_customer_id: customer_id,
      watt_hour: '100000'
    }
  )

  {
    subscription_id: subscription.id
  }
end

# Task 4: Create subscription with one-time item
# Creates a subscription with an additional one-time purchase on the first invoice
def handle_create_subscription_with_one_time_item(input)
  recurring_price_id = input[:recurring_price_id]
  one_time_price_id = input[:one_time_price_id]
  customer_email = input[:customer_email]

  # Create customer
  customer = Stripe::Customer.create(email: customer_email)

  # Create subscription with one-time invoice item
  subscription = Stripe::Subscription.create(
    customer: customer.id,
    items: [{ price: recurring_price_id, quantity: 1 }],
    add_invoice_items: [{ price: one_time_price_id, quantity: 1 }],
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.confirmation_secret']
  )

  {
    subscription_id: subscription.id,
    client_secret: subscription.latest_invoice.confirmation_secret.client_secret
  }
end

# Task 5: Create subscription with discount and billing cycle anchor
# Creates a subscription with a coupon and custom billing date (5th of next month at 9am UTC)
def handle_create_subscription_with_discount_and_billing_cycle_anchor(input)
  price_id = input[:price_id]
  customer_id = input[:customer_id]
  coupon_id = input[:coupon_id]

  # Calculate billing cycle anchor: 5th of next month at 9am UTC
  now = Time.now.utc
  next_month = now.month + 1
  year = now.year
  if next_month > 12
    next_month = 1
    year += 1
  end
  billing_anchor = Time.utc(year, next_month, 5, 9, 0, 0).to_i

  # Create subscription with discount and billing anchor
  subscription = Stripe::Subscription.create(
    customer: customer_id,
    items: [{ price: price_id, quantity: 1 }],
    discounts: [{ coupon: coupon_id }],
    billing_cycle_anchor: billing_anchor,
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.confirmation_secret']
  )

  {
    subscription_id: subscription.id,
    client_secret: subscription.latest_invoice.confirmation_secret.client_secret
  }
end

# Task 6: Create subscription schedule only
# Creates a subscription schedule for a 6-month installment plan
def handle_create_subscription_schedule_only(input)
  price_id = input[:price_id]
  customer_email = input[:customer_email]

  # Create customer
  customer = Stripe::Customer.create(email: customer_email)

  # Create subscription schedule with 6 iterations
  schedule = Stripe::SubscriptionSchedule.create(
    customer: customer.id,
    start_date: 'now',
    end_behavior: 'cancel',
    phases: [
      {
        items: [{ price: price_id, quantity: 1 }],
        iterations: 6
      }
    ],
    expand: ['subscription.latest_invoice.confirmation_secret']
  )

  invoice = Stripe::Invoice.finalize_invoice(schedule.subscription.latest_invoice.id, expand: ['confirmation_secret'])

  {
    subscription_schedule_id: schedule.id,
    client_secret: invoice.confirmation_secret.client_secret
  }
end

# Helper to wait for test clock to be ready
def wait_for_test_clock(test_clock_id)
  20.times do
    clock = Stripe::TestHelpers::TestClock.retrieve(test_clock_id)
    return clock if clock.status == 'ready'
    sleep 2
  end
  raise "Test clock #{test_clock_id} never became ready"
end

# Task 7: Upgrade subscription with proration
# Upgrades a subscription to a higher-tier plan with immediate prorated billing
def handle_upgrade_subscription_with_proration(input)
  subscription_id = input[:subscription_id]
  new_price_id = input[:new_price_id]

  # Get the subscription to find the subscription item ID
  subscription = Stripe::Subscription.retrieve(subscription_id)

  # Wait for test clock to be ready if it exists
  wait_for_test_clock(subscription.test_clock) if subscription.test_clock
  subscription_item_id = subscription.items.data[0].id

  # Update the subscription with the new price and proration
  updated_subscription = Stripe::Subscription.update(
    subscription_id,
    items: [
      {
        id: subscription_item_id,
        price: new_price_id,
        quantity: 1
      }
    ],
    proration_behavior: 'always_invoice'
  )

  {
    subscription_id: updated_subscription.id,
    customer_id: updated_subscription.customer,
    status: updated_subscription.status
  }
end

# Task 8: Downgrade subscription at end of cycle
# Schedules a downgrade to take effect at the end of the current billing cycle
def handle_downgrade_subscription_at_end_of_cycle(input)
  subscription_id = input[:subscription_id]
  old_price_id = input[:old_price_id]
  new_price_id = input[:new_price_id]

  # Get the subscription to determine current period
  subscription = Stripe::Subscription.retrieve(subscription_id)

  # Wait for test clock to be ready if it exists
  wait_for_test_clock(subscription.test_clock) if subscription.test_clock

  # Create a subscription schedule from the existing subscription
  schedule = Stripe::SubscriptionSchedule.create(
    from_subscription: subscription_id
  )

  # Calculate the end date for the second phase (one more billing period after downgrade)
  # Note: In basil API, current_period_end moved to subscription item level
  current_period_end = subscription.items.data[0].current_period_end
  current_period_end_time = Time.at(current_period_end).utc
  next_month = current_period_end_time.month + 1
  year = current_period_end_time.year
  if next_month > 12
    next_month = 1
    year += 1
  end
  next_period_end = Time.utc(year, next_month, 1, 9, 0, 0).to_i

  # Retrieve the schedule to get the current phase info
  schedule = Stripe::SubscriptionSchedule.retrieve(schedule.id)

  # Update the schedule with two phases
  Stripe::SubscriptionSchedule.update(
    schedule.id,
    phases: [
      {
        items: [{ price: old_price_id, quantity: 1 }],
        start_date: schedule.phases[0].start_date,
        end_date: schedule.phases[0].end_date
      },
      {
        items: [{ price: new_price_id, quantity: 1 }],
        iterations: 1
      }
    ],
    end_behavior: 'release'
  )

  {
    subscription_id: subscription_id,
    subscription_schedule_id: schedule.id
  }
end

# Task 9: Cancel subscription without proration
# Schedules cancellation on the 20th of the current month without proration
def handle_cancel_subscription_without_proration(input)
  subscription_id = input[:subscription_id]

  # Get the subscription to determine test clock time
  subscription = Stripe::Subscription.retrieve(subscription_id)

  # Get test clock to determine "current" time
  test_clock = Stripe::TestHelpers::TestClock.retrieve(subscription.test_clock)
  current_time = Time.at(test_clock.frozen_time).utc

  # Cancel at 20th of current month at 9am UTC
  cancel_at = Time.utc(current_time.year, current_time.month, 20, 9, 0, 0).to_i

  # Update subscription to cancel at the specified date
  Stripe::Subscription.update(
    subscription_id,
    cancel_at: cancel_at,
    proration_behavior: 'none'
  )

  {
    subscription_id: subscription_id
  }
end

# Task 10: Preview invoice
# Previews what the invoice would look like if the subscription were upgraded
def handle_preview_invoice(input)
  customer_id = input[:customer_id]
  subscription_id = input[:subscription_id]
  new_price_id = input[:new_price_id]

  # Get the subscription to find the subscription item ID and test clock
  subscription = Stripe::Subscription.retrieve(subscription_id)

  # Wait for test clock to be ready if it exists
  wait_for_test_clock(subscription.test_clock) if subscription.test_clock

  subscription_item_id = subscription.items.data[0].id

  # Get test clock to determine "current" time
  test_clock = Stripe::TestHelpers::TestClock.retrieve(subscription.test_clock)
  current_time = Time.at(test_clock.frozen_time).utc

  # Proration date: 20th of current month at 9am UTC
  proration_date = Time.utc(current_time.year, current_time.month, 20, 9, 0, 0).to_i

  # Create invoice preview
  preview = Stripe::Invoice.create_preview(
    customer: customer_id,
    subscription: subscription_id,
    subscription_details: {
      items: [
        {
          id: subscription_item_id,
          price: new_price_id,
          quantity: 1
        }
      ],
      proration_date: proration_date,
      proration_behavior: 'always_invoice'
    }
  )

  {
    full_upcoming_invoice_object: preview.to_hash
  }
end

get '/subscription-status' do
  content_type 'application/json'

  begin
    subscription = Stripe::Subscription.retrieve(params[:subscription_id])

    {
      status: subscription.status,
      # Note: In basil API, current_period_start/end moved to subscription item level
      current_period_start: subscription.items.data[0].current_period_start,
      current_period_end: subscription.items.data[0].current_period_end,
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

  if webhook_secret && !webhook_secret.empty?
    sig_header = request.env['HTTP_STRIPE_SIGNATURE']
    event = nil

    begin
      event = Stripe::Webhook.construct_event(
        payload, sig_header, webhook_secret
      )
    rescue JSON::ParserError => e
      status 400
      return
    rescue Stripe::SignatureVerificationError => e
      puts 'Webhook signature verification failed.'
      status 400
      return
    end
  else
    data = JSON.parse(payload, symbolize_names: true)
    event = Stripe::Event.construct_from(data)
  end

  case event.type
  when 'invoice.payment_succeeded'
    puts 'Payment succeeded for subscription!'
  when 'invoice.payment_failed'
    puts 'Payment failed for subscription!'
  when 'customer.subscription.created'
    puts 'New subscription created!'
  when 'customer.subscription.updated'
    puts 'Subscription updated!'
  when 'customer.subscription.deleted'
    puts 'Subscription cancelled!'
  end

  content_type 'application/json'
  {
    status: 'success'
  }.to_json
end
