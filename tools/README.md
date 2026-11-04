# Stripe tools

Stripe hosts a remote MCP server at `https://mcp.stripe.com`. Use your client or framework's native MCP support and follow the [Stripe MCP documentation](https://docs.stripe.com/mcp).

The local `@stripe/mcp` proxy is deprecated. Connect directly to the hosted server using native MCP support; see the [migration guide](https://docs.stripe.com/mcp) and [final local proxy source](https://github.com/stripe/ai/tree/ai-packages-final/tools/modelcontextprotocol).

## Retired Agent Toolkit and local MCP proxy

`@stripe/agent-toolkit` and `stripe-agent-toolkit` are deprecated and will receive no further updates, including security fixes. Use native MCP support instead.

Existing users with migration questions can contact [token-billing-team@stripe.com](mailto:token-billing-team@stripe.com).

The [final TypeScript source](https://github.com/stripe/ai/tree/ai-packages-final/tools/typescript) and [final Python source](https://github.com/stripe/ai/tree/ai-packages-final/tools/python) remain available for reference.
