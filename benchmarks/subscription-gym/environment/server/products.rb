# frozen_string_literal: true

require 'dotenv'
require 'stripe'

CURRENT_DIR = File.dirname(__FILE__)
Dotenv.load(File.join(CURRENT_DIR, '.env'))

module SubscriptionGym
  class Products

    CATALOG_FILE = File.join(CURRENT_DIR, 'product_catalog.json')

    CATALOG = [
      {
        id: 'unlimited_home_club_monthly',
        product_params: {
          name: 'Unlimited Home Club',
          description: 'Unlimited access to ONE gym location',
          default_price_data: {
            unit_amount: 6900,
            currency: 'usd',
            recurring: {
              interval: 'month'
            },
            tax_behavior: 'inclusive'
          }
        }
      },
      {
        id: 'unlimited_all_clubs_monthly',
        product_params: {
          name: 'Unlimited All Clubs',
          description: 'Unlimited access to ALL gym locations',
          default_price_data: {
            unit_amount: 9900,
            currency: 'usd',
            recurring: {
              interval: 'month'
            },
            tax_behavior: 'inclusive'
          }
        }
      },
      {
        id: 'crop_hoodie_navy',
        product_params: {
          name: 'Crop Hoodie Navy',
          description: 'We’re excited to expand our sweatshirt lineup with this cropped pullover-style hoodie!',
          default_price_data: {
            unit_amount: 1200,
            currency: 'usd',
            tax_behavior: 'inclusive'
          }
        }
      },
      {
        id: 'sofa_couch_monthly_instalment_plan',
        product_params: {
          name: 'Furniwell Convertible Sectional Sofa Couch',
          description: 'The seat and soft back cushion covered with breathable linen fabric. Sitting, lying down, or relaxing, this couch for living room will make your leisure time more enjoyable.',
          default_price_data: {
            unit_amount: 15000,
            currency: 'usd',
            recurring: {
              interval: 'month'
            },
            tax_behavior: 'inclusive'
          }
        }
      },
      {
        id: 'charging_usage_monthly',
        meter_params: {
          display_name: 'Charging meter',
          event_name: 'charging_meter',
          default_aggregation: {
            formula: 'sum'
          },
          customer_mapping: {
            event_payload_key: 'stripe_customer_id',
            type: 'by_id'
          },
          value_settings: {
            event_payload_key: 'watt_hour'
          }
        },
        price_params: {
          unit_amount: 45,
          currency: 'usd',
          billing_scheme: 'per_unit',
          transform_quantity: {
            divide_by: 1000,
            round: 'up'
          },
          recurring: {
            usage_type: 'metered',
            meter: '${meter.id}',
            interval: 'month'
          },
          product_data: {
            name: 'Charging Fee'
          },
          tax_behavior: 'inclusive'
        }
      },
    ].freeze

    def initialize; end

    def self.create_catalog
      Stripe.api_key = ENV['STRIPE_SECRET_KEY']
      Stripe.api_version = ENV['STRIPE_API_VERSION']

      catalog_hash = CATALOG.each_with_object({}) do |data, hash|
        data_id = data[:id]

        if (product_params = data[:product_params])
          product = Stripe::Product.create(product_params)
          hash[data_id] = product.default_price
          next
        end

        if (meter_params = data[:meter_params])
          meter_params[:event_name] += "_#{Time.now.to_i}"
          meter = Stripe::Billing::Meter.create(meter_params)

          price_params = data[:price_params]
          price_params[:recurring][:meter] = meter.id
          price = Stripe::Price.create(price_params)
          hash[data_id] = price.id
          next
        end
      end

      File.write(CATALOG_FILE, catalog_hash.to_json(pretty: true))

      catalog_hash
    end

    # Return a hash of {product_id: stripe_price_id}
    def self.retrieve_catalog
      begin
        if File.exist?(CATALOG_FILE)
          catalog = JSON.parse(File.read(CATALOG_FILE))
          return catalog if catalog.size == CATALOG.size
        end
      rescue JSON::ParserError => e
        puts "Error retrieving catalog: #{e}"
      end

      puts 'Creating catalog'
      create_catalog
    end
  end
end