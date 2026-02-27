## Your Task

This server is running on an old api version. Upgrade to 2025-03-31.basil.

**Requirements:**
1. Update the Stripe.net package version in `server/server.csproj` to version 48.0.0 or later
2. Run `dotnet restore` to download the updated SDK
3. Update the code to use the new patterns for accessing charges
4. Ensure all endpoints continue to work correctly
5. All response formats must remain unchanged (backward compatible)

## Testing
Generate test payment intents with charges, then verify the other endpoints work correctly.

