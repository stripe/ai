# frozen_string_literal: true

CREATE_SUBSCRIPTION_SCHEDULE_ONLY = {
  preconditions: [
    {
      name: 'price',
      path: '/v1/prices/{{sofa_couch_monthly_instalment_plan}}',
      method: 'GET',
      params: {}
    },
  ],
  challenge: {
    name: 'Create subscription schedule only',
    description: 'Create a monthly installment plan for a sofa priced at $900, with the following specifications:
      1. Monthly Installment Amount: The subscription should require a monthly payment of $150.00.
      2. Immediate Access: Customers must be able to start paying the first installment immediately.
      3. Payment Management: Ensure effective handling of any issues related to incomplete payments.
      4. Trial: There should be no trial period offered with this subscription.
      5. Discounts: No discounts are to be applied to the subscription.
      6. Payment Termination: Payments should cease once the total amount of $900 has been paid in full.
    ',
    api_contract: {
      input: {
        price_id: '${price.id}',
        customer_email: 'customer@example.com'
      },
      output: {
        client_secret: 'pi_xxx_secret_xxx',
        subscription_schedule_id: 'sub_sched_xxx'
      }
    }
  }
}.freeze
