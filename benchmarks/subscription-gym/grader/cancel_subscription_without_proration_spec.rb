# frozen_string_literal: true

require_relative './spec_helper.rb'

RSpec.describe 'Cancel subscription without proration' do
  # Solution
  # curl https://api.stripe.com/v1/subscriptions/sub_xxx \
  #   -u "sk_xxx" \
  #   -d "cancel_at"="{{YYYY-MM-20}}" \
  #   -d "proration_behavior"="none"
  it 'Grader - Cancel subscription without proration' do
    response = post_json(
      '/run-task',
      {
        challenge: 'cancel_subscription_without_proration' 
      }
    )

    subscription_id = response['subscription_id']
    expect(subscription_id).not_to be_nil

    subscription, test_clock = retrieve_subscription(subscription_id)
    expect(subscription).not_to be_nil
    expect(subscription.status).to eq('active')
    expect(test_clock).not_to be_nil

    current_frozen_time = Time.at(test_clock.frozen_time).utc
    year = current_frozen_time.year
    month = current_frozen_time.month

    # Verify whether the subscription is set to cancel on the 20th of the month
    expected_cancel_at_timestamp = Time.new(year, month, 20, 9, 0, 0, 0).to_i
    expect(subscription.cancel_at).to eq(expected_cancel_at_timestamp)

    # Advance to the actual cancel date
    advance_test_clock(test_clock.id, expected_cancel_at_timestamp)
    advanced_subscription, _test_clock = retrieve_subscription(subscription_id)

    # Verify the subscription is canceled
    expect(advanced_subscription.status).to eq('canceled')

    # Verify no new invoice is created
    expect(advanced_subscription.latest_invoice.id).to eq(subscription.latest_invoice.id)
  end
  
end
