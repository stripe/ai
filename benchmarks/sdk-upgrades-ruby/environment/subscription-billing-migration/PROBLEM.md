## Your Task

This server is running on an old Stripe api version. Upgrade to 2025-03-31.basil.

**Requirements:**
1. Update the Stripe SDK gem version in `server/Gemfile` to version 15.0.0 or later
2. Run `bundle update stripe` to install the updated SDK
3. Update the API version configuration in `server.rb`
4. Ensure all endpoints continue to work correctly
5. All response formats must remain unchanged (backward compatible)

## Testing
Generate test subscriptions, then verify the other endpoints work correctly.

