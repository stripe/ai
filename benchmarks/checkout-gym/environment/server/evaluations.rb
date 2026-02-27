# frozen_string_literal: true
#
# IMPORTANT: This file contains all challenge definitions and expected answers.
# It must be hidden from the agent's working environment. Exposing it would
# allow the agent to trivially solve the eval by reading the answers directly.
# checkout-gym-15d9d138-7edc-4398-9a00-ab48f840b734-solution
require 'json'
require 'date'
require_relative 'products'

module CheckoutGym
  class Evaluations

    PAYMENT_CHALLENGES = {
      'example_payment' => {
        ui_mode: 'embedded',
        mode: 'payment',
        line_items: [
          {
            price: '{{commuter_backpack}}',
            quantity: 1
          }
        ],
        return_url: '{{return_url}}'
      },
      'basic_payment' => {
        ui_mode: 'embedded',
        mode: 'payment',
        line_items: [
          {
            price: '{{commuter_backpack}}',
            quantity: 1
          },
          {
            price: '{{crop_hoodie_navy_xs}}',
            quantity: 1
          }
        ],
        return_url: '{{return_url}}'
      },
      'basic_payment_ko' => {
        ui_mode: 'embedded',
        mode: 'payment',
        line_items: [
          {
            price: '{{commuter_backpack_ko}}',
            quantity: 5
          }
        ],
        payment_method_types: ['card', 'kr_card', 'payco', 'naver_pay'],
        locale: 'ko',
        return_url: '{{return_url}}'
      },
      'basic_payment_custom_text' => {
        ui_mode: 'embedded',
        mode: 'payment',
        line_items: [
          {
            price: '{{commuter_backpack}}',
            quantity: 2
          },
        ],
        return_url: '{{return_url}}',
        custom_text: {
          after_submit: {
            message: 'Thank you for your order!'
          }
        }
      },
      'basic_payment_phone_number' => {
        ui_mode: 'embedded',
        mode: 'payment',
        line_items: [
          {
            price: '{{commuter_backpack}}',
            quantity: 1
          }
        ],
        phone_number_collection: {
          enabled: true
        },
        return_url: '{{return_url}}'
      },
      'basic_payment_consent_promotion_emails' => {
        ui_mode: 'embedded',
        mode: 'payment',
        line_items: [
          {
            price: '{{the_scaling_era_an_oral_history_of_ai_2019_2025_intl}}',
            quantity: 1
          }
        ],
        consent_collection: {
          promotions: 'auto'
        },
        return_url: '{{return_url}}'
      },
      'basic_payment_automatic_tax' => {
        ui_mode: 'embedded',
        mode: 'payment',
        line_items: [
          {
            price: '{{commuter_backpack}}',
            quantity: 1
          }
        ],
        automatic_tax: {
          enabled: true
        },
        return_url: '{{return_url}}'
      },
      'basic_payment_tax_id_collection' => {
        # NOTE: Take the screenshot with billing address in supported countries: https://docs.stripe.com/tax/checkout/tax-ids#supported-types
        ui_mode: 'embedded',
        mode: 'payment',
        line_items: [
          {
            price: '{{commuter_backpack}}',
            quantity: 100
          }
        ],
        tax_id_collection: {
          enabled: true,
          required: 'if_supported'
        },
        return_url: '{{return_url}}'
      },
      'basic_payment_quantity_adjustment' => {
        ui_mode: 'embedded',
        mode: 'payment',
        line_items: [
          {
            price: '{{sweatshirt_navy_2024_m}}',
            adjustable_quantity: {
              enabled: true,
              minimum: 1,
              maximum: 10
            },
            quantity: 1
          }
        ],
        return_url: '{{return_url}}'
      },
      'basic_payment_promotion_code' => {
        ui_mode: 'embedded',
        mode: 'payment',
        line_items: [
          {
            price: '{{mario_kart_multiple_currencies}}',
            quantity: 1
          }
        ],
        allow_promotion_codes: true,
        return_url: '{{return_url}}'
      },
      'basic_payment_optional_items' => {
        ui_mode: 'embedded',
        mode: 'payment',
        line_items: [
          {
            price: '{{crop_hoodie_navy_m}}',
            quantity: 1
          }
        ],
        optional_items: [
          {
            price: '{{sweatshirt_navy_2024_m}}',
            quantity: 1
          }
        ],
        return_url: '{{return_url}}'
      },
      'basic_payment_save_payment_method' => {
        ui_mode: 'embedded',
        mode: 'payment',
        line_items: [
          {
            price: '{{mario_kart_multiple_currencies}}',
            quantity: 1
          }
        ],
        payment_intent_data: {
          setup_future_usage: 'off_session'
        },
        return_url: '{{return_url}}'
      },
      'basic_donation' => {
        ui_mode: 'embedded',
        mode: 'payment',
        line_items: [
          {
            price: '{{donation_$200}}',
            quantity: 1
          }
        ],
        submit_type: 'donate',
        return_url: '{{return_url}}'
      },
      'complex_payment_custom_field_text' => {
        ui_mode: 'embedded',
        mode: 'payment',
        line_items: [
          {
            price: '{{personalized_leather_square_coaster_set}}',
            quantity: 5
          }
        ],
        custom_fields: [
          {
            key: 'color',
            label: {
              type: 'custom',
              custom: 'Choose a coaster color'
            },
            dropdown: {
              options: [
                {
                  label: 'Brown',
                  value: 'brown'
                },
                {
                  label: 'Red',
                  value: 'red'
                },
                {
                  label: 'Green',
                  value: 'green'
                },
                {
                  label: 'Blue',
                  value: 'blue'
                }
              ],
              default_value: 'brown'
            },
            type: 'dropdown'
          },
          {
            key: 'initials',
            label: {
              type: 'custom',
              custom: 'Personalize this item'
            },
            text: {
              minimum_length: 1,
              maximum_length: 3
            },
            type: 'text',
            optional: true
          },
          {
            key: 'recipient_phone_number',
            label: {
              type: 'custom',
              custom: 'Recipient phone number'
            },
            type: 'numeric',
            optional: true
          }
        ],
        return_url: '{{return_url}}'
      },
      'complex_payment_shipping' => {
        ui_mode: 'embedded',
        mode: 'payment',
        line_items: [
          {
            price: '{{crop_hoodie_navy_s}}',
            quantity: 20
          },
          {
            price: '{{crop_hoodie_navy_m}}',
            quantity: 30
          },
          {
            price: '{{crop_hoodie_navy_l}}',
            quantity: 30
          },
          {
            price: '{{crop_hoodie_navy_xl}}',
            quantity: 25
          }
        ],
        custom_text: {
          shipping_address: {
            message: 'We work with UPS to ship your order.'
          }
        },
        shipping_address_collection: {
          allowed_countries: ['US', 'CA']
        },
        shipping_options: [
          {
            shipping_rate_data: {
              display_name: 'Standard',
              delivery_estimate: {
                minimum: {
                  unit: 'business_day',
                  value: 5
                },
                maximum: {
                  unit: 'business_day',
                  value: 7
                }
              },
              fixed_amount: {
                amount: 2000,
                currency: 'usd'
              },
              type: 'fixed_amount'
            }
          },
          {
            shipping_rate_data: {
              display_name: 'Express',
              delivery_estimate: {
                minimum: {
                  unit: 'business_day',
                  value: 1
                },
                maximum: {
                  unit: 'business_day',
                  value: 3
                }
              },
              fixed_amount: {
                amount: 5000,
                currency: 'usd'
              },
              type: 'fixed_amount'
            }
          }
        ],
        return_url: '{{return_url}}'
      },
      'mega_complex_payment' => {
        ui_mode: 'embedded',
        mode: 'payment',
        line_items: [
          {
            price: '{{crop_hoodie_navy_s}}',
            quantity: 50
          },
          {
            price: '{{crop_hoodie_navy_m}}',
            quantity: 50
          },
          {
            price: '{{crop_hoodie_navy_l}}',
            quantity: 50
          },
        ],
        allow_promotion_codes: true,
        billing_address_collection: 'required',
        consent_collection: {
          promotions: 'auto'
        },
        custom_fields: [
          {
            key: 'color',
            label: {
              type: 'custom',
              custom: 'Choose the hoodie color'
            },
            dropdown: {
              options: [
                {
                  label: 'Red',
                  value: 'red'
                },
                {
                  label: 'Green',
                  value: 'green'
                },
                {
                  label: 'Blue',
                  value: 'blue'
                }
              ],
              default_value: 'red'
            },
            type: 'dropdown'
          }
        ],
        custom_text: {
          shipping_address: {
            message: 'We work with UPS to ship your order.'
          },
          after_submit: {
            message: 'Thank you for your order!'
          }
        },
        optional_items: [
          {
            price: '{{gear_hauler_box}}',
            quantity: 1
          }
        ],
        payment_intent_data: {
          setup_future_usage: 'off_session'
        },
        phone_number_collection: {
          enabled: true
        },
        shipping_address_collection: {
          allowed_countries: ['US', 'CA']
        },
        shipping_options: [
          {
            shipping_rate_data: {
              display_name: 'Standard',
              delivery_estimate: {
                minimum: {
                  unit: 'business_day',
                  value: 5
                },
                maximum: {
                  unit: 'business_day',
                  value: 7
                }
              },
              fixed_amount: {
                amount: 2000,
                currency: 'usd'
              },
              type: 'fixed_amount'
            }
          },
          {
            shipping_rate_data: {
              display_name: 'Express',
              delivery_estimate: {
                minimum: {
                  unit: 'business_day',
                  value: 1
                },
                maximum: {
                  unit: 'business_day',
                  value: 3
                }
              },
              fixed_amount: {
                amount: 5000,
                currency: 'usd'
              },
              type: 'fixed_amount'
            }
          }
        ],
        return_url: '{{return_url}}'
      }
    }.freeze

    SETUP_CHALLENGES = {
      'basic_setup' => {
        ui_mode: 'embedded',
        mode: 'setup',
        currency: 'usd',
        return_url: '{{return_url}}'
      }
    }.freeze

    SUBSCRIPTION_CHALLENGES = {
      'basic_subscription' => {
        ui_mode: 'embedded',
        mode: 'subscription',
        line_items: [
          {
            price: '{{streaming_standard_monthly}}',
            quantity: 1
          }
        ],
        return_url: '{{return_url}}'
      },
      'basic_subscription_trial' => {
        ui_mode: 'embedded',
        mode: 'subscription',
        line_items: [
          {
            price: '{{streaming_premium_monthly}}',
            quantity: 1
          }
        ],
        subscription_data: {
          trial_period_days: 7
        },
        return_url: '{{return_url}}'
      },
      'basic_subscription_with_one_time_price' => {
        ui_mode: 'embedded',
        mode: 'subscription',
        line_items: [
          {
            price: '{{streaming_premium_monthly}}',
            quantity: 1
          },
          {
            price: '{{streaming_tv_box}}',
            quantity: 1
          }
        ],
        return_url: '{{return_url}}'
      },
      'basic_subscription_billing_cycle_anchor_with_proration' => {
        ui_mode: 'embedded',
        mode: 'subscription',
        line_items: [
          {
            price: '{{streaming_premium_monthly}}',
            quantity: 1
          }
        ],
        subscription_data: {
          billing_cycle_anchor: '{{next_1st_or_15th_timestamp}}',
          proration_behavior: 'create_prorations'
        },
        return_url: '{{return_url}}'
      },
      'basic_subscription_billing_cycle_anchor_without_proration' => {
        ui_mode: 'embedded',
        mode: 'subscription',
        line_items: [
          {
            price: '{{streaming_premium_monthly}}',
            quantity: 1
          }
        ],
        subscription_data: {
          billing_cycle_anchor: '{{next_1st_or_15th_timestamp}}',
          proration_behavior: 'none'
        },
        return_url: '{{return_url}}'
      },
      'basic_subscription_promotion_code' => {
        ui_mode: 'embedded',
        mode: 'subscription',
        line_items: [
          {
            price: '{{streaming_premium_monthly}}',
            quantity: 1
          }
        ],
        allow_promotion_codes: true,
        return_url: '{{return_url}}'
      },
      'basic_subscription_shipping' => {
        ui_mode: 'embedded',
        mode: 'subscription',
        line_items: [
          {
            price: '{{dishwasher_detergent_tablet_monthly}}',
            quantity: 2
          },
          {
            price: '{{laundry_detergent_tablet_monthly}}',
            quantity: 2
          }
        ],
        shipping_address_collection: {
          allowed_countries: ['US', 'CA']
        },
        return_url: '{{return_url}}'
      },
      'basic_subscription_optional_items' => {
        ui_mode: 'embedded',
        mode: 'subscription',
        line_items: [
          {
            price: '{{laundry_detergent_tablet_monthly}}',
            quantity: 2
          },
          {
            price: '{{dishwasher_detergent_tablet_monthly}}',
            quantity: 2
          }
        ],
        optional_items: [
          {
            price: '{{dishwasher_laundry_detergent_duo}}',
            quantity: 1
          }
        ],
        return_url: '{{return_url}}'
      },
      'complex_subscription' => {
        ui_mode: 'embedded',
        mode: 'subscription',
        line_items: [
          {
            price: '{{laundry_detergent_tablet_monthly}}',
            quantity: 2
          },
          {
            price: '{{dishwasher_detergent_tablet_monthly}}',
            quantity: 2
          }
        ],
        allow_promotion_codes: true,
        billing_address_collection: 'required',
        consent_collection: {
          promotions: 'auto'
        },
        custom_text: {
          shipping_address: {
            message: 'We work with UPS to ship your order.'
          },
          after_submit: {
            message: 'Thank you for your order!'
          }
        },
        optional_items: [
          {
            price: '{{dishwasher_laundry_detergent_duo}}',
            quantity: 1
          }
        ],
        phone_number_collection: {
          enabled: true
        },
        shipping_address_collection: {
          allowed_countries: ['US', 'CA']
        },
        return_url: '{{return_url}}'
      }
    }.freeze

    # Checkout Session Creation API spec: https://docs.stripe.com/api/checkout/sessions/create
    ALL_CHALLENGES = {
      **PAYMENT_CHALLENGES,
      **SETUP_CHALLENGES,
      **SUBSCRIPTION_CHALLENGES
    }.freeze

    PRODUCT_CATALOG = CheckoutGym::Products.retrieve_catalog
    YOUR_DOMAIN = 'http://localhost:4242'

    def initialize; end

    def self.valid_challenge_name?(challenge_name)
      ALL_CHALLENGES.key?(challenge_name)
    end

    def self.get_challenge(challenge_name)
      challenge = ALL_CHALLENGES[challenge_name].dup

      line_items = challenge[:line_items]&.map do |item|
        own_product_id = item[:price].gsub(/[{}]/, '')
        {
          price: PRODUCT_CATALOG[own_product_id],
          quantity: item[:quantity]
        }
      end

      optional_items = challenge[:optional_items]&.map do |item|
        own_product_id = item[:price].gsub(/[{}]/, '')
        {
          price: PRODUCT_CATALOG[own_product_id],
          quantity: item[:quantity]
        }
      end

      return_url = challenge[:return_url].gsub(
        '{{return_url}}',
        "#{YOUR_DOMAIN}/session-status?session_id={CHECKOUT_SESSION_ID}"
      )

      if (billing_cycle_anchor = challenge.dig(:subscription_data, :billing_cycle_anchor))
        billing_cycle_anchor = billing_cycle_anchor.gsub(
          '{{next_1st_or_15th_timestamp}}',
          _get_upcoming_1st_or_15th_timestamp.to_s
        )
        challenge[:subscription_data][:billing_cycle_anchor] = billing_cycle_anchor
      end

      challenge[:line_items] = line_items
      challenge[:optional_items] = optional_items
      challenge[:return_url] = return_url
      # Remove any nil-valued keys from the challenge payload
      challenge.compact!
      challenge
    end

    def self._get_upcoming_1st_or_15th_timestamp
      today = Time.now

      # Find the next 1st and 15th
      upcoming_dates = [1, 15].map do |day|
        date = Date.new(today.year, today.month, day)
        date = date.next_month if date.to_time <= today.to_time
        date
      end

      upcoming_dates.min.to_time.to_i
    end

    # Export a fully-resolved set of challenges where any placeholders
    # (e.g., price tokens like "{{commuter_backpack}}" and timing/URL tokens)
    # are converted using the same logic as get_challenge.
    # Returns a Hash of challenge_name => resolved_payload
    def self.export_all_challenges
      ALL_CHALLENGES.keys.each_with_object({}) do |name, acc|
        acc[name] = get_challenge(name)
      end
    end

    # Write the export to a JSON file
    def self.export_all_challenges_to_file(filepath)
      data = export_all_challenges
      File.write(filepath, JSON.pretty_generate(data))
      filepath
    end

    # Export variant: full payload for 'example_payment', empty objects for all others
    def self.export_all_challenges_empty_variant
      ALL_CHALLENGES.keys.each_with_object({}) do |name, acc|
        acc[name] = (name == 'example_payment' ? get_challenge(name) : {})
      end
    end

    # Write the empty-variant export to a JSON file
    def self.export_all_challenges_empty_variant_to_file(filepath)
      data = export_all_challenges_empty_variant
      File.write(filepath, JSON.pretty_generate(data))
      filepath
    end
  end
end

# Allow running this file directly to export all challenges
if $PROGRAM_NAME == __FILE__
  if ARGV.include?('--export-empty')
    idx = ARGV.index('--export-empty')
    candidate = ARGV[idx + 1]
    output = candidate && !candidate.start_with?('-') ? candidate : File.expand_path('submission.json', __dir__)
    CheckoutGym::Evaluations.export_all_challenges_empty_variant_to_file(output)
    puts "Exported ALL_CHALLENGES (empty variant) to #{output}"
  elsif ARGV.include?('--export')
    idx = ARGV.index('--export')
    candidate = ARGV[idx + 1]
    output = candidate && !candidate.start_with?('-') ? candidate : File.expand_path('all_challenges.json', __dir__)
    CheckoutGym::Evaluations.export_all_challenges_to_file(output)
    puts "Exported ALL_CHALLENGES to #{output}"
  else
    puts 'Usage: ruby evaluations.rb --export [output_path] | --export-empty [output_path]'
  end
end
