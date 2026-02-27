## Your Task

This server is running on Stripe API version 2022-08-01. Upgrade to 2025-03-31.basil.

**Requirements:**
1. Update the Stripe Java SDK version in `pom.xml` to version 29.0.0
2. Run `mvn clean install` to install the updated SDK
3. Update the API version configuration in `Server.java`
4. Fix any breaking changes 
5. Ensure all endpoints continue to work correctly
6. All response formats must remain unchanged (backward compatible)

## Testing
The grader will automatically create test invoices and verify the endpoints work correctly.

