# Checkout Gallery - Stripe Checkout Session Configuration

You will be given a link to a website: localhost:4242/checkout.html?challenge={CHALLENGE_KEY} that can be constructed via a Stripe API; your task is to produce the API call and list the UI components used to create each screenshot or link. The screenshots may have other UI that isn’t part of the Stripe UI integration but there will always be a Stripe UI as part of the checkout pages provided.

For each checkout UI provide the following:
Checkout Session API call - Provide an example API call that would be used to create the UI provided; submit this via a JSON object representing the arguments you would put into the create Checkout Session API call (POST /v1/checkout/sessions)
Product data - Most products already exist in the Stripe account as objects fetchable via the Products API and should be used as arguments in the Checkout Session whenever possible; there will be some cases where the product doesn’t exist and in this case, you should directly instantiate a new product and price in the API call.
A mapping between the canonical ID (commuter_backpack) and the Stripe product ID (prod_***) is provided in product_catalog.json; this file should be read and understood to accomplish the task.

Submission Format
There will be a submission.json file with an example challenge showing a well formed submission; your task is to navigate to the other examples by passing the key as a query parameter to inspect the UI and reconstruct the parameters from the Stripe Checkout Session API that would produce this UI. There will be a submission.json file with an example challenge showing a well formed submission; your task is to navigate to the other examples by passing the key as a query parameter to inspect the UI and reconstruct the parameters from the Stripe Checkout Session API that would produce this UI. To fully complete this task, a submission should be provided for all challenge keys in the JSON file.

Rules
- Deducting the Checkout Session API call should only use viewing the UI elements in the browser, and fetching product data from Stripe API. Do not directly inspect the server side or inspect the actual Checkout Session API calls being made.

Recommendations
Search the Stripe documentation to understand the Checkout APIs
Use the Stripe API keys to fetch the existing products and prices - this will be provided to you in an .env file in your workspace
Create sample code and run in the browser to verify your guess.

If the browser doesn't appear to show a checkout page, try refreshing the page. If you can't manage to get the browser to show a checkout page, you may conclude the challenge by submitting the existing submission.json file.
