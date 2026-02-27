## Your Task

This server is running on Stripe API version 2022-08-01. Upgrade to 2025-03-31.basil or later.

**Requirements:**
1. Update the Stripe SDK gem version in `server/Gemfile` to version 15.0.0 or later
2. Run `bundle update stripe` to install the updated SDK
3. Update the API version configuration in `server.rb`
4. Fix any breaking changes related to invoice and payment intent relationships
5. Ensure all endpoints continue to work correctly
6. All response formats must remain unchanged (backward compatible)

## Testing
The grader will automatically create test invoices and verify the endpoints work correctly.

