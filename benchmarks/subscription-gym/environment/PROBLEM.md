# Subscription Gym - Stripe Subscription API Implementation

The repository provided has a server file - server.rb; your task is primarily to fill in the implementation of the /run-task endpoint, which is provided with a ‘challenge’ parameter; this challenge key represents a particular task. Each task involves a specific subscription business model, and your task is to generate the necessary API call(s) to create or update the subscription setup for the business.

For each task, you will receive the subscription business model along with the API contract, which details both the input and output. The input will include the product catalog, customer information, and any existing subscriptions that have been set up in advance for you. The output will consist of the data you need to return in JSON format.

Product data - Most products already exist as objects in the Stripe account and can be retrieved using the Products API. You should use these existing products as arguments whenever possible. If a product does not exist, you should instantiate a new product and price directly in the API call.
Customer information - Customer information may include a pre-existing Stripe customer ID or only basic customer details. You may retrieve the customer information using the Customers API. If the Stripe customer does not exist, you should create a new customer in the API call using the provided information such as the email address.
Subscription: A pre-existing subscription ID may be included. You may retrieve the subscription information using the Subscriptions API. If the subscription does not exist, you should follow the subscription business model to create one.

You may test your subscription setup by making real Stripe API calls if needed. The environment file has the necessary api keys. The tool search_stripe_documentation is available.