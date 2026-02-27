# frozen_string_literal: true

require 'json'
require 'net/http'
require 'uri'
require_relative 'products'

# Dynamically load all task files from the tasks folder
Dir[File.join(__dir__, 'tasks', '*.rb')]
  .each { |file|
    require_relative file
  }

module SubscriptionGym
  class Challenges
    # Challenge format
    # - preconditions: <Requests to be created before the challenge>
    #   - name: <name of the request>
    #   - path: <endpoint of the request>
    #   - method: <HTTP method of the request>
    #   - params: <parameters of the request>
    # - challenge:
    #   - name: <name of the challenge>
    #   - description: <description of the challenge>
    #   - api_contract:
    #     - input: <input of the challenge>
    #     - output: <output of the challenge>

    ALL_SUBSCRIPTION_CHALLENGES = {
      'cancel_subscription_without_proration' => CANCEL_SUBSCRIPTION_WITHOUT_PRORATION,
      'create_subscription_only' => CREATE_SUBSCRIPTION_ONLY,
      'create_subscription_schedule_only' => CREATE_SUBSCRIPTION_SCHEDULE_ONLY,
      'create_subscription_with_discount_and_billing_cycle_anchor' => CREATE_SUBSCRIPTION_WITH_DISCOUNT_AND_BILLING_CYCLE_ANCHOR,
      'create_subscription_with_one_time_item' => CREATE_SUBSCRIPTION_WITH_ONE_TIME_ITEM,
      'create_subscription_with_trial' => CREATE_SUBSCRIPTION_WITH_TRIAL,
      'create_subscription_with_usage_billing' => CREATE_SUBSCRIPTION_WITH_USAGE_BILLING,
      'downgrade_subscription_at_end_of_cycle' => DOWNGRADE_SUBSCRIPTION_AT_END_OF_CYCLE,
      'preview_invoice' => PREVIEW_INVOICE,
      'upgrade_subscription_with_proration' => UPGRADE_SUBSCRIPTION_WITH_PRORATION
    }.freeze

    PRODUCT_CATALOG = SubscriptionGym::Products.retrieve_catalog
    STRIPE_SECRET_KEY = ENV['STRIPE_SECRET_KEY']

    def initialize; end

    def self.valid_challenge_name?(challenge_name)
      ALL_SUBSCRIPTION_CHALLENGES.key?(challenge_name)
    end

    def self.get_challenge(challenge_name)
      task = ALL_SUBSCRIPTION_CHALLENGES[challenge_name].dup
      precondition_hash = _setup_preconditions(task[:preconditions])

      # Substitute template variables in api_contract input only
      if task.dig(:challenge, :api_contract, :input)
        task[:challenge][:api_contract][:input] = _substitute_templates(
          task[:challenge][:api_contract][:input],
          precondition_hash
        )
      end

      task[:precondition_hash] = precondition_hash
      task[:challenge]
      # task
    end

    def self._setup_preconditions(preconditions)
      conditions = preconditions.each_with_object({}) do |precondition, hash|
        name = precondition[:name]
        path = precondition[:path]
        method = precondition[:method]
        params = precondition[:params]

        # Substitute product catalog placeholders in path (e.g., {{unlimited_home_club_monthly}})
        if path =~ %r{/v1/prices/{{(.+?)}}}
          own_product_id = Regexp.last_match(1)
          stripe_price_id = PRODUCT_CATALOG[own_product_id]
          path = path.gsub("/v1/prices/{{#{own_product_id}}}", "/v1/prices/#{stripe_price_id}")
        end

        # Substitute date placeholders (e.g., {{YYYY-MM-01}}) with Unix timestamps
        params = _substitute_date_placeholders(params)

        # Substitute template variables from previous preconditions (e.g., ${test_clock.id})
        path = _substitute_templates(path, hash)
        params = _substitute_templates(params, hash)

        precondition[:path] = path
        precondition[:params] = params

        hash[name] = _make_stripe_request(path, method, params)
      end

      conditions
    end

    def self._make_stripe_request(path, method, params)
      uri = URI("https://api.stripe.com#{path}")
      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = true

      request = case method
                when 'GET'
                  Net::HTTP::Get.new(uri)
                when 'POST'
                  req = Net::HTTP::Post.new(uri)
                  req.set_form_data(_flatten_params(params))
                  req
                end

      request['Authorization'] = "Bearer #{STRIPE_SECRET_KEY}"

      begin
        response = http.request(request)
        raise response.body.to_s if response.code != '200'
      rescue => e
        puts "Path: #{path}"
        puts "Method: #{method}"
        puts "Params: #{params}"
        puts "Error making stripe request: #{e}"
        raise e
      end

      JSON.parse(response.body)
    end

    # Flatten nested params for Stripe API
    # e.g., {items: [{price: 'price_123'}]} => {'items[0][price]' => 'price_123'}
    def self._flatten_params(params, parent_key = nil)
      result = {}
      params.each do |key, value|
        full_key = parent_key ? "#{parent_key}[#{key}]" : key.to_s

        case value
        when Hash
          result.merge!(_flatten_params(value, full_key))
        when Array
          value.each_with_index do |item, index|
            indexed_key = "#{full_key}[#{index}]"
            if item.is_a?(Hash)
              result.merge!(_flatten_params(item, indexed_key))
            else
              result[indexed_key] = item.to_s
            end
          end
        else
          result[full_key] = value.to_s
        end
      end
      result
    end

    # Substitute date placeholders like {{YYYY-MM-01}} with Unix timestamps
    def self._substitute_date_placeholders(obj)
      case obj
      when Hash
        obj.each_with_object({}) do |(key, value), result|
          result[key] = _substitute_date_placeholders(value)
        end
      when Array
        obj.map { |item| _substitute_date_placeholders(item) }
      when String
        # Match {{YYYY-MM-DD}} pattern
        obj.gsub(/{{YYYY-MM-(\d{2})}}/) do
          day = Regexp.last_match(1).to_i
          _get_current_month_date_timestamp(day)
        end
      else
        obj
      end
    end

    # Get Unix timestamp for a specific day in the current month
    def self._get_current_month_date_timestamp(day)
      now = Time.now
      date = Time.new(now.year, now.month, day, 9, 0, 0, 0)
      date.to_i
    end

    # Recursively substitute template variables like ${price.id}
    # with values from a hash
    def self._substitute_templates(obj, hash)
      case obj
      when Hash
        obj.each_with_object({}) do |(key, value), result|
          result[key] = _substitute_templates(value, hash)
        end
      when Array
        obj.map { |item| _substitute_templates(item, hash) }
      when String
        # Match ${variable.path.to.value}
        obj.gsub(/\$\{([^}]+)\}/) do
          template_path = Regexp.last_match(1)
          _resolve_template_path(template_path, hash)
        end
      else
        obj
      end
    end

    # Resolve a template path like "price.id" to hash["price"]["id"]
    def self._resolve_template_path(path, hash)
      parts = path.split('.')
      value = hash

      parts.each do |part|
        value = value[part] || value[part.to_sym]
        break if value.nil?
      end

      value || "${#{path}}" # Return original if not found
    end
  end
end

if $PROGRAM_NAME == __FILE__
  challenge = SubscriptionGym::Challenges.get_challenge('create_subscription_with_one_time_item')

  puts JSON.pretty_generate(challenge)
end
