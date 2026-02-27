# frozen_string_literal: true

require_relative './spec_helper.rb'

RSpec.describe 'Galtee test integration' do
  it 'serves the products route' do
    _, status = get_json('/products')

    expect(status).to eq(200)
  end

  it 'serves a simple purchase case' do
    _, status = post_json('/purchase', {
                            'product' => 'fr_hike',
                            'email' => 'hiker+test@stripe.com',
                            'amount' => 0,
                            'currency' => 'eur',
                            'payment_method' => 'tok_visa'
                          })
    expect(status).to eq(200)
  end

  it 'serves a simple purchase case with invalid payment method' do
    _, status = post_json('/purchase', {
                            'product' => 'fr_hike',
                            'email' => 'hiker+test@stripe.com',
                            'amount' => 0,
                            'currency' => 'eur',
                            'payment_method' => 'tok_visa_chargeDeclined'
                          })

    expect(status).to eq(200)
  end
end
