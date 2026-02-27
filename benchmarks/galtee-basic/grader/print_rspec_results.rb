#!/usr/bin/env ruby
# frozen_string_literal: true

require 'json'

path = ARGV[0] || '/tmp/rspec_results.json'

begin
  data = JSON.parse(File.read(path))
rescue Errno::ENOENT
  abort("Missing results file: #{path}")
rescue JSON::ParserError => e
  abort("Invalid JSON in #{path}: #{e.message}")
end

puts '### Galtee Basic Grader Results ###'

if data['summary_line']
  puts data['summary_line']
else
  summary = data['summary'] || {}
  puts "#{summary['example_count']} examples, #{summary['failure_count']} failures, #{summary['pending_count']} pending"
end

failed = (data['examples'] || []).select { |e| e['status'] == 'failed' }
if failed.any?
  puts 'Failed:'
  failed.each do |e|
    file_path = e['file_path'].to_s
    line_number = e['line_number'].to_s
    description = e['full_description'].to_s
    puts "- #{file_path}:#{line_number} #{description}"
  end
end


