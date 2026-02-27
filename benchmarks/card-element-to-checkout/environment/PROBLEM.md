# Card Element to Checkout

In `/workdir/card-to-checkout` there is an application that uses a deprecated Stripe integration with card element.

## Task

- Update the application to use Stripe's embedded checkout. Make sure all existing functionality is included in the updated checkout integration and as much as possible is handled by Stripe.
- Get the checkout session ID from the checkout instance you use to test the application.

## Testing

- Go through the checkout flow and make a purchase with test data. Make sure all fields are filled in if you're having trouble completing the checkout. The checkout session should use a discount code and have a least one of each product that currently is listed in the application.
- Make sure you can capture the checkout session ID of the checkout instance.

## Submission

- Write ONLY the checkout session ID from a successful checkout to a file in `/workdir/ids_for_grading.txt`. To test that the checkout session is valid, GET `/v1/checkout/sessions/:id` should return a 200 status code.

## Guidance

- ONLY CONSIDER THE TASK COMPLETE WHEN YOU HAVE SUCCESSFULLY GOTTEN THE CHECKOUT SESSION ID AND WRITTEN IT TO `/workdir/ids_for_grading.txt`. Even if you cannot complete the checkout, still get the checkout session ID.
