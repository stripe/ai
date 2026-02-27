# frozen_string_literal: true

require_relative './spec_helper.rb'
require_relative './../environment/server/products.rb'

PRODUCT_CATALOG = SubscriptionGym::Products.retrieve_catalog

RSpec.describe 'Downgrade subscription at end of cycle' do
  # Solutions
  # curl https://api.stripe.com/v1/subscription_schedules \
  #   -u "sk_xxx" \
  #   -d "from_subscription"="{{subscription_id}}"
  #
  # curl https://api.stripe.com/v1/subscription_schedules/sub_sched_xxx \
  #   -u "sk_xxx" \
  #   -d "phases[0][items][0][price]"="{{old_price_id}}" \
  #   -d "phases[0][items][0][quantity]"="1" \
  #   -d "phases[0][start_date]"="{{start_date}}" \
  #   -d "phases[0][end_date]"="{{end_date}}" \
  #   -d "phases[1][items][0][price]"="{{new_price_id}}" \
  #   -d "phases[1][items][0][quantity]"="1" \
  #   -d "phases[1][iterations]"="1" \
  #   -d "end_behavior"="release"
  it 'Grader - Downgrade subscription at end of cycle' do
    response = post_json(
      '/run-task',
      {
        challenge: 'downgrade_subscription_at_end_of_cycle'
      }
    )

    subscription_id = response['subscription_id']
    subscription_schedule_id = response['subscription_schedule_id']
    expect(subscription_id).not_to be_nil
    expect(subscription_schedule_id).not_to be_nil

    subscription, _test_clock = retrieve_subscription(subscription_id)
    subscription_schedule = retrieve_subscription_schedule(subscription_schedule_id)

    # Note: In basil API, current_period_end/start moved to subscription item level
    current_period_end = Time.at(subscription.items.data[0].current_period_end).utc
    new_year = current_period_end.year
    new_month = current_period_end.month + 1
    if new_month > 12
      new_year += (new_month - 1) / 12
      new_month = ((new_month - 1) % 12) + 1
    end
    next_period_end_date = Time.utc(new_year, new_month, 1, 9, 0, 0, 0)

    # Verify the subscription schedule is created correctly
    expect(subscription_schedule.status).to eq('active')
    expect(subscription_schedule.phases.length).to eq(2)
    expect(subscription_schedule.phases[0].items[0].price).to eq(PRODUCT_CATALOG['unlimited_all_clubs_monthly'])
    expect(subscription_schedule.phases[0].items[0].quantity).to eq(1)
    expect(subscription_schedule.phases[0].start_date).to eq(subscription.items.data[0].current_period_start)
    expect(subscription_schedule.phases[0].end_date).to eq(subscription.items.data[0].current_period_end)
    expect(subscription_schedule.phases[1].items[0].price).to eq(PRODUCT_CATALOG['unlimited_home_club_monthly'])
    expect(subscription_schedule.phases[1].items[0].quantity).to eq(1)
    expect(subscription_schedule.phases[1].end_date).to eq(next_period_end_date.to_i)
    expect(subscription_schedule.end_behavior).to eq('release')
  end
end
