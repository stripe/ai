# Migrate from Stripe Agent Toolkit to native MCP

Stripe Agent Toolkit is deprecated and will receive no further updates, including security fixes. Use your client or framework's native MCP support with `https://mcp.stripe.com`.

Existing users with migration questions can contact [token-billing-team@stripe.com](mailto:token-billing-team@stripe.com).

1. Follow the [Stripe MCP connection and authentication instructions](https://docs.stripe.com/mcp) for your client or framework.
2. Replace toolkit initialization and imports with the native MCP integration. Preserve any required connected-account context and configure least-privilege permissions using the supported authentication method. The old `configuration.actions` option is not an authorization boundary; use restricted-key permissions and any controls your client provides.
3. Verify tool discovery and a read-only tool call in a sandbox before switching production traffic.
4. Remove the toolkit dependency once the replacement is working.

The final toolkit implementation remains available in the [final source snapshot](https://github.com/stripe/ai/tree/ai-packages-final/tools/python). Existing published distributions remain available for reproducibility.
