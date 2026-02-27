# frozen_string_literal: true
require_relative './spec_helper.rb'

RSpec.describe 'Galtee test integration' do
  it 'serves the products route' do
    response = get_json('/products')

    expected = [
      { 'id' => 'fr_hike',      'price' => 32_500, 'currency' => 'eur', 'name' => 'French Alps hike' },
      { 'id' => 'gb_hike',      'price' => 20_000, 'currency' => 'gbp', 'name' => 'Hadrians wall hike' },
      { 'id' => 'painters_way', 'price' => 25_000, 'currency' => 'eur', 'name' => "Painter's Way hike" }
    ]

    expect(response).to match_array(expected)
  end

  it 'serves purchases for test users' do
    resp = get_json('/customer/hiker+test@stripe.com/bookings')

    # get first purchase
    purchase = resp.first
    expect(purchase['product']).to eq('fr_hike')
    expect(purchase['amount_paid']).to eq(32_500)
    expect(purchase['currency']).to eq('eur')
    expect(purchase['status']).to eq('complete')

    resp = get_json('/customer/hiker+1123@stripe.com/bookings')
    purchase = resp.first
    expect(purchase['product']).to eq('painters_way')
    expect(purchase['amount_paid']).to eq(0)
    expect(purchase['status']).to eq('incomplete')
  end

  it 'does not allow phone purchase refunds' do
    body, status = post_json('/customer/hiker+test@stripe.com/bookings/fr_hike/refund', {})
    expect(status).to eq(400)
    expect(body['error']['message']).to eq('Phone bookings cannot be refunded')
  end

  it 'allows web purchase refunds' do
    unique_email = "test+#{Time.now.to_i}@stripe.com"
    
    body, status = post_json('/purchase', {
      'product' => 'fr_hike',
      'email' => unique_email,
      'amount' => 32_500,
      'currency' => 'eur',
      'payment_method' => 'pm_card_us'
    })
    expect(status).to eq(200)
    
    # refund the purchase
    refund_body, refund_status = post_json("/customer/#{unique_email}/bookings/fr_hike/refund", {})
    expect(refund_status).to eq(200)
    
    # check final state
    resp = get_json("/customer/#{unique_email}/bookings/fr_hike")
    expect(resp['status']).to eq('refunded')
    expect(resp['amount_paid']).to eq(0)
  end

  it 'handles card declines' do
    body, status = post_json('/purchase', {
      'product' => 'fr_hike',
      'amount' => 32_500,
      'email' => 'hiker+test@stripe.com',
      'payment_method' => 'pm_card_visa_chargeDeclined'
    })
    expect(status).to eq(400)
    expect(body['error']['code']).to eq('card_declined')
  end
end
