## Your Task

This server is running on an old api version. Upgrade so that it uses 2025-03-31.basil.

**Requirements:**
1. Update the Stripe SDK version in `server/pom.xml` to v29
2. Run `mvn clean install` to download the updated SDK
3. Update the code to use the new patterns for accessing charges
4. Ensure all endpoints continue to work correctly
5. All response formats must remain unchanged (backward compatible)

## Testing
Verify all endpoints work correct after the api and sdk version bump.

