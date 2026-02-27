# frozen_string_literal: true
# EVAL_LEAK_CHECK: sdk-upgrades-ruby-subscription-billing-migration-c3efe58e-a583-4031-83cc-bd4e49e13305-solution
require 'dotenv'
require 'sinatra'
require 'stripe'
require 'json'

CURRENT_DIR = File.dirname(__FILE__)
Dotenv.load(File.join(CURRENT_DIR, '.env'))

set :port, 4242

Stripe.api_key = ENV['STRIPE_SECRET_KEY']
# Updated to new API version (from older pre-basil version)
Stripe.api_version = '2025-03-31.basil'

get '/config' do
  content_type 'application/json'
  {
    publishableKey: ENV['STRIPE_PUBLISHABLE_KEY']
  }.to_json
end

# Returns summary of a subscription including billing period details
# UPDATED: In basil API, current_period_start/end moved from subscription to subscription items
get '/subscription-summary' do
  content_type 'application/json'

  begin
    subscription_id = params[:subscription_id]

    subscription = Stripe::Subscription.retrieve(subscription_id)

    # In basil API, current_period_start/end are on subscription items, not subscription
    first_item = subscription.items.data.first
    current_period_start = first_item&.current_period_start
    current_period_end = first_item&.current_period_end

    # Calculate billing period details
    period_start = Time.at(current_period_start)
    period_end = Time.at(current_period_end)
    days_in_period = ((period_end - period_start) / 86400).to_i
    days_remaining = ((period_end - Time.now) / 86400).to_i

    {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      status: subscription.status,
      currentPeriodStart: current_period_start,
      currentPeriodEnd: current_period_end,
      billingPeriodDetails: {
        startDate: period_start.strftime('%Y-%m-%d'),
        endDate: period_end.strftime('%Y-%m-%d'),
        totalDays: days_in_period,
        daysRemaining: days_remaining > 0 ? days_remaining : 0,
        percentComplete: days_in_period > 0 ? ((days_in_period - days_remaining).to_f / days_in_period * 100).round(2) : 0
      },
      amount: first_item&.price&.unit_amount,
      interval: first_item&.price&.recurring&.interval
    }.to_json
  rescue Stripe::StripeError => e
    status 400
    { error: e.message }.to_json
  end
end

# Lists active subscriptions for a customer with count
# UPDATED: Removed include: ['total_count'] - forbidden in basil API
# UPDATED: current_period_end is now on subscription items
get '/active-subscriptions' do
  content_type 'application/json'

  begin
    customer_id = params[:customer_id]

    # Don't use include: ['total_count'] - it's forbidden in basil
    subscriptions = Stripe::Subscription.list(
      customer: customer_id,
      status: 'active'
    )

    subscription_summaries = subscriptions.data.map do |sub|
      # Get current_period_end from subscription items
      first_item = sub.items.data.first
      {
        id: sub.id,
        status: sub.status,
        currentPeriodEnd: first_item&.current_period_end,
        amount: first_item&.price&.unit_amount,
        interval: first_item&.price&.recurring&.interval
      }
    end

    {
      customerId: customer_id,
      activeSubscriptions: subscription_summaries,
      totalCount: subscriptions.data.length,  # Count manually instead of using total_count
      hasMore: subscriptions.has_more
    }.to_json
  rescue Stripe::StripeError => e
    status 400
    { error: e.message }.to_json
  end
end

# Analyzes subscription metrics for a customer
# UPDATED: Removed include: ['total_count'] - forbidden in basil API
post '/subscription-metrics' do
  content_type 'application/json'
  request_body = JSON.parse(request.body.read)

  begin
    customer_id = request_body['customer_id']

    # Don't use include: ['total_count'] - it's forbidden in basil
    # Fetch all subscriptions to count properly - must use status: 'all' to include canceled
    all_subs = Stripe::Subscription.list(
      customer: customer_id,
      status: 'all',
      limit: 100  # Fetch more to ensure we get all
    )

    # Count by status
    active_count = 0
    past_due_count = 0
    canceled_count = 0
    total_mrr = 0

    all_subs.data.each do |sub|
      case sub.status
      when 'active'
        active_count += 1
        first_item = sub.items.data.first
        amount = first_item&.price&.unit_amount || 0
        interval = first_item&.price&.recurring&.interval
        # Convert to MRR
        total_mrr += case interval
                     when 'month' then amount
                     when 'year' then (amount / 12.0).round
                     else amount
                     end
      when 'past_due'
        past_due_count += 1
      when 'canceled'
        canceled_count += 1
      end
    end

    {
      customerId: customer_id,
      totalSubscriptions: all_subs.data.length,  # Count manually
      metrics: {
        active: active_count,
        pastDue: past_due_count,
        canceled: canceled_count
      },
      monthlyRecurringRevenue: total_mrr,
      averageSubscriptionValue: active_count > 0 ? (total_mrr.to_f / active_count).round(2) : 0
    }.to_json
  rescue Stripe::StripeError => e
    status 400
    { error: e.message }.to_json
  end
end

# Get billing cycle progress for multiple subscriptions
# UPDATED: current_period_start/end are now on subscription items
post '/billing-cycle-progress' do
  content_type 'application/json'
  request_body = JSON.parse(request.body.read)

  begin
    subscription_ids = request_body['subscription_ids'] || []

    results = subscription_ids.map do |sub_id|
      subscription = Stripe::Subscription.retrieve(sub_id)

      # Get period from subscription items
      first_item = subscription.items.data.first
      current_period_start = first_item&.current_period_start
      current_period_end = first_item&.current_period_end

      period_start = Time.at(current_period_start)
      period_end = Time.at(current_period_end)
      days_in_period = ((period_end - period_start) / 86400).to_i
      days_elapsed = ((Time.now - period_start) / 86400).to_i

      {
        subscriptionId: sub_id,
        status: subscription.status,
        periodStart: current_period_start,
        periodEnd: current_period_end,
        daysInPeriod: days_in_period,
        daysElapsed: days_elapsed,
        percentComplete: days_in_period > 0 ? (days_elapsed.to_f / days_in_period * 100).round(2) : 0
      }
    end

    {
      subscriptions: results,
      totalAnalyzed: results.length
    }.to_json
  rescue Stripe::StripeError => e
    status 400
    { error: e.message }.to_json
  end
end
