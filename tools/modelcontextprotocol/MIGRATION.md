# Migrate from the local Stripe MCP proxy to hosted MCP

`@stripe/mcp` is deprecated and will receive no further updates, including security fixes. Use your client or framework's native MCP support to connect directly to `https://mcp.stripe.com`.

Existing users with migration questions can contact [token-billing-team@stripe.com](mailto:token-billing-team@stripe.com).

1. Follow the current [Stripe MCP connection and authentication instructions](https://docs.stripe.com/mcp) for your client.
2. Replace the local `npx @stripe/mcp`, Docker, or desktop-extension configuration with the supported hosted MCP configuration. Preserve connected-account context and least-privilege permissions using the supported authentication method.
3. Verify tool discovery and a read-only call in a sandbox before switching production traffic.
4. Remove the old local proxy configuration and dependency after the hosted connection works. Do not remove the replacement hosted connection.

The [final local proxy source](https://github.com/stripe/ai/tree/ai-packages-final/tools/modelcontextprotocol) remains available for reference. The hosted Stripe MCP server is maintained separately and is not being shut down.
