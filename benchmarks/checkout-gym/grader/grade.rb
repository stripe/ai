# frozen_string_literal: true
# EVAL_LEAK_CHECK: checkout-gym-15d9d138-7edc-4398-9a00-ab48f840b734-grader

require 'json'

module CheckoutGym
  class Products
    def self.retrieve_catalog
      json_path = File.expand_path('../environment/server/product_catalog.json', __dir__)
      JSON.parse(File.read(json_path))
    end
  end
end

evaluations_path = File.expand_path('../environment/server/evaluations.rb', __dir__)
require evaluations_path

def strip_braces(value)
  value.to_s.gsub(/\A\{\{|\}\}\z/, '')
end

def score_match(expected, actual, id_to_key, path = [], details = [])
  matched = 0
  total = 0

  case expected
  when Hash
    expected.each do |ek, ev|
      next unless actual.is_a?(Hash) && actual.key?(ek)
      av = actual[ek]

      if ek.to_s == 'price'
        expected_key = id_to_key[strip_braces(ev)]
        actual_key = av
        total += 1
        if actual_key == expected_key
          matched += 1
          details << { path: (path + [ek]).join('.'), expected: expected_key, got: actual_key, result: 'match' }
        else
          details << { path: (path + [ek]).join('.'), expected: expected_key, got: actual_key, result: 'mismatch' }
        end
      elsif ev.is_a?(String) && ev.match?(/\A\{\{.*\}\}\z/)
        # Skip non-price placeholders (e.g., return_url token)
        next
      else
        if ev.is_a?(Hash) || ev.is_a?(Array)
          sub_match, sub_total, _ = score_match(ev, av, id_to_key, path + [ek], details)
          matched += sub_match
          total += sub_total
        else
          total += 1
          if av == ev
            matched += 1
            details <<({ path: (path + [ek]).join('.'), expected: ev, got: av, result: 'match' })
          else
            details <<({ path: (path + [ek]).join('.'), expected: ev, got: av, result: 'mismatch' })
          end
        end
      end
    end
  when Array
    len = [expected.length, actual.is_a?(Array) ? actual.length : 0].min
    (0...len).each do |i|
      sub_match, sub_total, _ = score_match(expected[i], actual[i], id_to_key, path + ["[#{i}]"], details)
      matched += sub_match
      total += sub_total
    end
  else
    total += 1
    if actual == expected
      matched += 1
      details <<({ path: path.join('.'), expected: expected, got: actual, result: 'match' })
    else
      details <<({ path: path.join('.'), expected: expected, got: actual, result: 'mismatch' })
    end
  end

  [matched, total, details]
end

# Build reverse map: price id -> evaluator key
catalog = CheckoutGym::Products.retrieve_catalog
id_to_key = catalog.each_with_object({}) { |(key, id), h| h[key.to_s] = id }

# Load submission.json (sibling to this file)
submission_path = File.expand_path('submission.json', __dir__)
unless File.exist?(submission_path)
  abort({ error: "Missing submission.json in #{File.dirname(submission_path)}" }.to_json)
end

submission = JSON.parse(File.read(submission_path), symbolize_names: true)

# Score all challenges
all_results = CheckoutGym::Evaluations::ALL_CHALLENGES.map do |name, template|
  m, t, details = score_match(template, submission[name.to_sym], id_to_key)
  { challenge_name: name, matched: m, total: t, score: t.zero? ? 0.0 : (m.to_f / t), details: details }
end.sort_by { |r| -r[:score] }

puts JSON.pretty_generate(all_results)


