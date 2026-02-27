# frozen_string_literal: true
require 'dotenv'
require 'sinatra'
require 'stripe'
require 'json'

CURRENT_DIR = File.dirname(__FILE__)
Dotenv.load(File.join(CURRENT_DIR, '.env'))

set :port, 4242

Stripe.api_key = ENV['STRIPE_SECRET_KEY']

get '/config' do
  content_type 'application/json'
  {
    publishableKey: ENV['STRIPE_PUBLISHABLE_KEY']
  }.to_json
end

# Returns summary of a subscription including billing period details
get '/subscription-summary' do
  content_type 'application/json'
  
  begin
    subscription_id = params[:subscription_id]
    
    subscription = Stripe::Subscription.retrieve(subscription_id)
    
    # Calculate billing period details
    period_start = Time.at(subscription.current_period_start)
    period_end = Time.at(subscription.current_period_end)
    days_in_period = ((period_end - period_start) / 86400).to_i
    days_remaining = ((period_end - Time.now) / 86400).to_i
    
    {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      status: subscription.status,
      currentPeriodStart: subscription.current_period_start,
      currentPeriodEnd: subscription.current_period_end,
      billingPeriodDetails: {
        startDate: period_start.strftime('%Y-%m-%d'),
        endDate: period_end.strftime('%Y-%m-%d'),
        totalDays: days_in_period,
        daysRemaining: days_remaining > 0 ? days_remaining : 0,
        percentComplete: days_in_period > 0 ? ((days_in_period - days_remaining).to_f / days_in_period * 100).round(2) : 0
      },
      amount: subscription.items.data.first&.price&.unit_amount,
      interval: subscription.items.data.first&.price&.recurring&.interval
    }.to_json
  rescue Stripe::StripeError => e
    status 400
    { error: e.message }.to_json
  end
end

# Lists active subscriptions for a customer with count
get '/active-subscriptions' do
  content_type 'application/json'
  
  begin
    customer_id = params[:customer_id]
    
    subscriptions = Stripe::Subscription.list(
      customer: customer_id,
      status: 'active',
      include: ['total_count']
    )
    
    subscription_summaries = subscriptions.data.map do |sub|
      {
        id: sub.id,
        status: sub.status,
        currentPeriodEnd: sub.current_period_end,
        amount: sub.items.data.first&.price&.unit_amount,
        interval: sub.items.data.first&.price&.recurring&.interval
      }
    end
    
    {
      customerId: customer_id,
      activeSubscriptions: subscription_summaries,
      totalCount: subscriptions.total_count,
      hasMore: subscriptions.has_more
    }.to_json
  rescue Stripe::StripeError => e
    status 400
    { error: e.message }.to_json
  end
end

# Analyzes subscription metrics for a customer
post '/subscription-metrics' do
  content_type 'application/json'
  request_body = JSON.parse(request.body.read)
  
  begin
    customer_id = request_body['customer_id']
    
    # Get all subscriptions with total_count included
    all_subs = Stripe::Subscription.list(
      customer: customer_id,
      include: ['total_count'] 
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
        amount = sub.items.data.first&.price&.unit_amount || 0
        interval = sub.items.data.first&.price&.recurring&.interval
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
      totalSubscriptions: all_subs.total_count,
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
post '/billing-cycle-progress' do
  content_type 'application/json'
  request_body = JSON.parse(request.body.read)
  
  begin
    subscription_ids = request_body['subscription_ids'] || []
    
    results = subscription_ids.map do |sub_id|
      subscription = Stripe::Subscription.retrieve(sub_id)
      
      period_start = Time.at(subscription.current_period_start)
      period_end = Time.at(subscription.current_period_end)
      days_in_period = ((period_end - period_start) / 86400).to_i
      days_elapsed = ((Time.now - period_start) / 86400).to_i
      
      {
        subscriptionId: sub_id,
        status: subscription.status,
        periodStart: subscription.current_period_start,
        periodEnd: subscription.current_period_end,
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
