# Subscription Gym Server

A [Sinatra](http://sinatrarb.com/) implementation for creating and managing Stripe subscriptions.

## Requirements

- Ruby v3.1.4+
- [Configured .env file](../README.md)

## How to run

1. Install dependencies

```
bundle install
```

2. Run the application

```
ruby server.rb
```

3. The server will be available at `http://localhost:4242`

## API Endpoints

### POST /create-subscription
Creates a new subscription based on the challenge specified in the request body.

Request body:
```json
{
  "challenge": "basic_subscription"
}
```

### GET /subscription-status?subscription_id=sub_xxx
Retrieves the status of a subscription.

### GET /config
Returns the Stripe publishable key for client-side integration.

### POST /webhook
Handles Stripe webhook events for subscription lifecycle events.
