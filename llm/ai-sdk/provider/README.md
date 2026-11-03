# Stripe AI SDK Provider

> **Deprecated:** This package is no longer maintained and will receive no further updates, including security fixes. See the current [Stripe Token Billing documentation](https://docs.stripe.com/billing/token-billing) for integration guidance. [Final source](https://github.com/stripe/ai/tree/ai-packages-final/llm/ai-sdk/provider). Existing users with migration questions can contact [token-billing-team@stripe.com](mailto:token-billing-team@stripe.com).

The documentation below is retained for historical reference.

The Stripe AI SDK Provider enables seamless integration with leading AI models through Stripe's unified LLM proxy at `llm.stripe.com`. This custom provider for the Vercel AI SDK automatically tracks token usage and integrates with Stripe's billing system, making it easy to monetize AI features in your applications.

> **Note:** This is part of the [`@stripe/ai-sdk`](../README.md) package. See the main README for an overview of all available tools.

## Private preview access required

The Stripe AI SDK Provider is currently only available to organizations participating in the Billing for LLM Tokens Private Preview. If you do not have access and would like to request it, please visit:

**[Request Access to Billing for LLM Tokens Private Preview](https://docs.stripe.com/billing/token-billing)**

## Why use Stripe AI SDK Provider?

- **Automatic Usage Tracking**: Token consumption is automatically tracked and reported to Stripe for billing
- **Multi-Model Support**: Access models from OpenAI, Google Gemini, and Anthropic Claude through a single API
- **Built-in Billing**: Seamlessly integrate AI costs into your existing Stripe billing workflow
- **Customer Attribution**: Automatically attribute usage to specific customers for accurate billing
- **Production-Ready**: Enterprise-grade infrastructure with Stripe's reliability
- **Transparent Costs**: Track and bill AI usage alongside your other Stripe products

Learn more about Stripe's Token Billing in the [Stripe Documentation](https://docs.stripe.com/billing/token-billing).

## Setup

The Stripe AI SDK Provider is available in the `@stripe/ai-sdk` package. You can install it with:

```bash
npm install @stripe/ai-sdk
```

## Provider instance

To create a Stripe provider instance, use the `createStripe` function:

```typescript
import { createStripe } from '@stripe/ai-sdk/provider';

const stripeLLM = createStripe({
  apiKey: process.env.STRIPE_API_KEY,
  customerId: 'cus_xxxxx', // Optional default customer ID
});
```

### Configuration options

- `apiKey` (required): Your Stripe API key from the [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
- `customerId` (optional): Default customer ID to attribute usage to
- `baseURL` (optional): Custom base URL (defaults to `https://llm.stripe.com`)
- `headers` (optional): Additional headers to include in requests

## Supported models

The Stripe provider supports models from multiple providers through a unified interface. Specify models using the format `provider/model-name`:

### OpenAI models

```typescript
const model = stripe('openai/gpt-5');
const miniModel = stripe('openai/gpt-5-mini');
const reasoningModel = stripe('openai/o3');
```

**Available models:**
- `openai/gpt-5`, `openai/gpt-5-mini`, `openai/gpt-5-nano`
- `openai/gpt-4.1`, `openai/gpt-4.1-mini`, `openai/gpt-4.1-nano`
- `openai/gpt-4o`, `openai/gpt-4o-mini`
- `openai/o3`, `openai/o3-mini`, `openai/o3-pro`
- `openai/o1`, `openai/o1-mini`, `openai/o1-pro`

### Google Gemini models

```typescript
const model = stripe('google/gemini-2.5-pro');
const fastModel = stripe('google/gemini-2.5-flash');
```

**Available models:**
- `google/gemini-2.5-pro`
- `google/gemini-2.5-flash`, `google/gemini-2.5-flash-lite`
- `google/gemini-2.0-flash`, `google/gemini-2.0-flash-lite`

### Anthropic Claude models

```typescript
const model = stripe('anthropic/claude-sonnet-4');
const capableModel = stripe('anthropic/claude-opus-4');
```

**Available models:**
- `anthropic/claude-opus-4`, `anthropic/claude-opus-4-1`
- `anthropic/claude-sonnet-4`, `anthropic/claude-3-7-sonnet`
- `anthropic/claude-3-5-haiku`, `anthropic/claude-3-haiku`

## Examples

### Generate text

```typescript
import { createStripe } from '@stripe/ai-sdk/provider';
import { generateText } from 'ai';

const stripeLLM = createStripe({
  apiKey: process.env.STRIPE_API_KEY,
  customerId: 'cus_xxxxx',
});

const { text } = await generateText({
  model: stripe('openai/gpt-5'),
  prompt: 'What are the three primary colors?',
});

console.log(text);
```

### Stream text

```typescript
import { createStripe } from '@stripe/ai-sdk/provider';
import { streamText } from 'ai';

const stripeLLM = createStripe({
  apiKey: process.env.STRIPE_API_KEY,
  customerId: 'cus_xxxxx',
});

const result = streamText({
  model: stripe('google/gemini-2.5-flash'),
  prompt: 'Write a short story about AI.',
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
```

### Multi-turn conversations

```typescript
import { createStripe } from '@stripe/ai-sdk/provider';
import { generateText } from 'ai';

const stripeLLM = createStripe({
  apiKey: process.env.STRIPE_API_KEY,
  customerId: 'cus_xxxxx',
});

const result = await generateText({
  model: stripe('openai/gpt-4.1'),
  messages: [
    { role: 'user', content: 'What is the capital of France?' },
    { role: 'assistant', content: 'The capital of France is Paris.' },
    { role: 'user', content: 'What is its population?' },
  ],
});

console.log(result.text);
```

## Customer ID management

The Stripe provider offers flexible customer ID configuration to ensure accurate billing attribution. Customer IDs can be specified at three levels (in order of priority):

### Per-request setting (highest priority)

```typescript
await generateText({
  model: stripe('openai/gpt-5'),
  prompt: 'Hello!',
  providerOptions: {
    stripe: {
      customerId: 'cus_request_specific',
    },
  },
});
```

### Model-level setting

```typescript
const model = stripe('openai/gpt-5', {
  customerId: 'cus_model_level',
});

await generateText({
  model,
  prompt: 'Hello!',
});
```

### Provider-level setting

```typescript
const stripeLLM = createStripe({
  apiKey: process.env.STRIPE_API_KEY,
  customerId: 'cus_provider_level',
});
```

### Usage tracking

Access token usage information after generation:

```typescript
const result = await generateText({
  model: stripe('openai/gpt-5'),
  prompt: 'Hello!',
});

console.log(result.usage);
// { inputTokens: 2, outputTokens: 10, totalTokens: 12 }
```

## Supported AI SDK features

The Stripe provider supports the following AI SDK features:

- **Text Generation**: Both streaming and non-streaming
- **Multi-turn Conversations**: Complex conversation histories
- **Streaming**: Real-time token streaming
- **Temperature & Sampling**: All standard generation parameters
- **Stop Sequences**: Custom stop sequence support
- **Token Limits**: Max output tokens configuration

### Feature limitations

- **Tool Calling**: Function calling and tool use aren't currently supported by the llm.stripe.com API
- **Text Embeddings**: Embedding models aren't supported yet
- **Image Generation**: Image models aren't supported yet

## Additional resources

- [Stripe Token Billing Documentation](https://docs.stripe.com/billing/token-billing)
- [Vercel AI SDK Documentation](https://sdk.vercel.ai/docs)
- [AI SDK Custom Providers Guide](https://sdk.vercel.ai/docs/providers/custom-providers)
- [Example Applications](./examples/)
