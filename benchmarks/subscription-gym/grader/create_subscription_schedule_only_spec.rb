require_relative './spec_helper.rb'
require_relative './../environment/server/products.rb'

PRODUCT_CATALOG = SubscriptionGym::Products.retrieve_catalog

RSpec.describe 'Create subscription schedule only' do
  # Solutions
  # curl https://api.stripe.com/v1/subscription_schedules \
  #   -u "sk_xxx" \
  #   -d "customer"="{{customer_id}}" \
  #   -d "phases[0][items][0][price]"="{{price_id}}" \
  #   -d "phases[0][items][0][quantity]"="1" \
  #   -d "phases[0][iterations]"="6" \
  #   -d "end_behavior"="cancel" \
  #   -d "start_date"="now"
  #
  # curl -X POST https://api.stripe.com/v1/invoices/in_xxx/finalize \
  #   -u "sk_xxx"
  it 'Grader - Create subscription schedule only' do
    response = post_json(
      '/run-task',
      {
        challenge: 'create_subscription_schedule_only'
      }
    )

    client_secret = response['client_secret']
    subscription_schedule_id = response['subscription_schedule_id']
    expect(client_secret).not_to be_nil
    expect(subscription_schedule_id).not_to be_nil

    subscription_schedule = retrieve_subscription_schedule(subscription_schedule_id)
    expect(subscription_schedule).not_to be_nil

    schedule_start_date = Time.at(subscription_schedule.current_phase.start_date).utc
    new_year = schedule_start_date.year
    new_month = schedule_start_date.month + 6
    if new_month > 12
      new_year += (new_month - 1) / 12
      new_month = ((new_month - 1) % 12) + 1
    end

    expected_cancel_at_date = Time.utc(
      new_year,
      new_month,
      schedule_start_date.day,
      schedule_start_date.hour,
      schedule_start_date.min,
      schedule_start_date.sec
    )

    # Verify the subscription schedule is created correctly
    expect(subscription_schedule.status).to eq('active')
    expect(subscription_schedule.phases.length).to eq(1)
    expect(subscription_schedule.phases[0].items[0].price).to eq(PRODUCT_CATALOG['sofa_couch_monthly_instalment_plan'])
    expect(subscription_schedule.phases[0].items[0].quantity).to eq(1)
    expect(subscription_schedule.phases[0].start_date).to eq(schedule_start_date.to_i)
    expect(subscription_schedule.phases[0].end_date).to eq(expected_cancel_at_date.to_i)
    expect(subscription_schedule.end_behavior).to eq('cancel')

    # Verify the customer is created correctly
    customer = retrieve_customer(subscription_schedule.customer)
    expect(customer.email).to eq('customer@example.com')

    # Verify the client secret is extracted correctly
    expect(client_secret).to eq(subscription_schedule.subscription.latest_invoice.confirmation_secret.client_secret)
  end
end
