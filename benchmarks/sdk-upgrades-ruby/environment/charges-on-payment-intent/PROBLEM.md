## Your Task

This server is running on an old api version. Upgrade to 2025-03-31.basil.

**Requirements:**
1. Update the Stripe SDK gem version in `server/Gemfile` to use v15
2. Run `bundle install` to install the updated SDK
3. Update the API version configuration in `server.rb`
4. Ensure all endpoints continue to work correctly
5. All response formats must remain unchanged (backward compatible)

## Testing
Generate test payment intents with charges, then verify the other endpoints work correctly.
