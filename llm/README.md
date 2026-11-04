# LLM metering packages

> **Deprecated:** This package is no longer maintained and will receive no further updates, including security fixes. See the current [Stripe Token Billing documentation](https://docs.stripe.com/billing/token-billing) for integration guidance. [Final source](https://github.com/stripe/ai/tree/ai-packages-final/llm). Existing users with migration questions can contact [token-billing-team@stripe.com](mailto:token-billing-team@stripe.com).

The documentation below is retained for historical reference.

This directory contains two packages for tracking and billing LLM token usage with Stripe.

## Private preview access required

Stripe Billing for LLM Tokens is currently only available to organizations participating in the Billing for LLM Tokens Private Preview. If you don't have access and would like to request it, please visit:

**[Request Access to Billing for LLM Tokens Private Preview](https://docs.stripe.com/billing/token-billing)**

## Packages

### `@stripe/ai-sdk`

The Stripe AI SDK provides tools for integrating AI models with Stripe's billing infrastructure when using the Vercel AI SDK. It includes two components:



- **Provider** (`@stripe/ai-sdk/provider`): A custom Vercel AI SDK provider that routes requests through Stripe's LLM proxy at `llm.stripe.com`. It provides a unified interface to access OpenAI, Google Gemini, and Anthropic Claude models with automatic usage tracking and billing integration.

- **Meter** (`@stripe/ai-sdk/meter`): A wrapper utility that adds billing tracking to any Vercel AI SDK v2 language model. This allows you to use your preferred provider while still tracking usage in Stripe without changing your existing provider setup.

### Use ai-sdk when

- You're using or want to use Vercel AI SDK
- You want a unified interface across multiple AI providers
- You want AI SDK-specific features like tool calling abstractions
- You prefer the AI SDK's streaming abstractions


[View ai-sdk documentation](./ai-sdk/README.md)

### `@stripe/token-meter`

@stripe/token-meter provides generic token metering for native AI SDKs with automatic Stripe billing integration. Unlike the ai-sdk package, this works directly with native SDKs from OpenAI, Anthropic, and Google Gemini without requiring the Vercel AI SDK or any other framework.

It automatically detects provider and response types, supports both streaming and non-streaming responses, and sends billing events asynchronously to Stripe without blocking your application.

### Use token-meter when

- You're using native SDKs (OpenAI, Anthropic, Google) directly
- You don't want framework dependencies
- You need maximum control over API parameters
- You're working with embeddings or specialized APIs

[View token-meter documentation](./token-meter/README.md)


## Installation

For Vercel AI SDK integration:
```bash
npm install @stripe/ai-sdk
```

For native SDK integration:
```bash
npm install @stripe/token-meter
```

## Additional resources

- [Stripe Meter Events Documentation](https://docs.stripe.com/api/billing/meter-event)
- [Stripe Token Billing Documentation](https://docs.stripe.com/billing/token-billing)
- [Vercel AI SDK Documentation](https://sdk.vercel.ai/docs)

## License

MIT

