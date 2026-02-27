require 'net/http'
require 'json'
require 'date'
require 'dotenv/load'

SERVER_URL = 'http://localhost:4242'

def make_request(path, method = 'GET', body = nil)
  uri = URI("#{SERVER_URL}#{path}")
  
  case method.upcase
  when 'POST'
    request = Net::HTTP::Post.new(uri)
    request['Content-Type'] = 'application/json'
    request.body = body.to_json if body
  when 'GET'
    request = Net::HTTP::Get.new(uri)
  end
  
  Net::HTTP.start(uri.hostname, uri.port, read_timeout: 30) do |http|
    http.request(request)
  end
end

RSpec.configure do |config|
  config.before(:suite) do
    # Check if server is running
    begin
      response = make_request('/config')
      if response.code != '200'
        puts "\n⚠️  Server returned unexpected status: #{response.code}"
        exit 1
      end
    rescue Errno::ECONNREFUSED
      puts "\n⚠️  Server is not running on #{SERVER_URL}"
      puts "Please start the server with: cd environment/server && ruby server.rb"
      exit 1
    rescue => e
      puts "\n⚠️  Error connecting to server: #{e.message}"
      exit 1
    end
  end
end

