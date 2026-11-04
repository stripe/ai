# Metering utilities for Vercel AI SDK

> **Deprecated:** This package is no longer maintained and will receive no further updates, including security fixes. See the current [Stripe Token Billing documentation](https://docs.stripe.com/billing/token-billing) for integration guidance. [Final source](https://github.com/stripe/ai/tree/ai-packages-final/llm/ai-sdk/meter). Existing users with migration questions can contact [token-billing-team@stripe.com](mailto:token-billing-team@stripe.com).

The documentation below is retained for historical reference.

The Stripe AI SDK Meter enables automatic token usage tracking and billing for any Vercel AI SDK language model. This wrapper intercepts AI SDK calls and automatically reports usage to Stripe meter events, making it easy to bill customers for their AI consumption.

> This is part of the [`@stripe/ai-sdk`](../README.md) package. See the main README for an overview of all available tools.

## Private preview access required

The Stripe AI SDK is currently only available to organizations participating in the Billing for LLM Tokens Private Preview. If you don't have access and would like to request it, please visit:

**[Request Access to Billing for LLM Tokens Private Preview](https://docs.stripe.com/billing/token-billing)**

## Why use the AI SDK Meter?

- **Universal Compatibility**: Works with any AI SDK v2 provider (OpenAI, Anthropic, Google, and more)
- **Automatic Usage Tracking**: Token consumption is automatically tracked and reported to Stripe
- **Seamless Integration**: Simple wrapper function requires minimal code changes
- **Customer Attribution**: Automatically attribute usage to specific customers for accurate billing
- **Non-Intrusive**: Preserves all original model functionality while adding billing capabilities
- **Fire-and-Forget**: Billing events are sent asynchronously without blocking API responses

Learn more about Stripe's Token Billing and request access to the latest features from the [Stripe Documentation](https://docs.stripe.com/billing/token-billing).

## Installation

```bash
npm install @stripe/ai-sdk
```

## Basic usage

Wrap any AI SDK v2 language model with `meteredModel` to enable automatic usage tracking:

```typescript
import { meteredModel } from '@stripe/ai-sdk/meter';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

const model = meteredModel(
  openai('gpt-4o-mini'),
  process.env.STRIPE_API_KEY,
  'cus_xxxxx'
);

const { text } = await generateText({
  model,
  prompt: 'What are the three primary colors?',
});
```

## API reference

### `meteredModel(model, stripeApiKey, stripeCustomerId)`

Wraps a Vercel AI SDK language model to automatically report usage to Stripe meter events.

**Parameters:**
- `model` (LanguageModelV2): The AI SDK language model instance to wrap
- `stripeApiKey` (string): Your Stripe API key
- `stripeCustomerId` (string): The Stripe customer ID to attribute usage to

**Returns:**
The wrapped model with identical functionality plus automatic usage tracking.

## Supported providers

The wrapper works with any AI SDK provider that implements the v2 specification (`LanguageModelV2`):

**Example supported providers:**
- OpenAI (`@ai-sdk/openai`)
- Anthropic (`@ai-sdk/anthropic`)
- Google Gemini (`@ai-sdk/google`)
- Azure OpenAI (via `@ai-sdk/openai`)
- Amazon Bedrock (`@ai-sdk/amazon-bedrock`)
- Any custom provider implementing `LanguageModelV2`

## Examples

### Streaming responses

```typescript
import { meteredModel } from '@stripe/ai-sdk/meter';
import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';

const model = meteredModel(
  anthropic('claude-3-5-sonnet-20241022'),
  process.env.STRIPE_API_KEY,
  'cus_xxxxx'
);

const result = streamText({
  model,
  prompt: 'Write a short story about AI.',
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
```

### Multi-turn conversations

```typescript
import { meteredModel } from '@stripe/ai-sdk/meter';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

const model = meteredModel(
  google('gemini-2.5-flash'),
  process.env.STRIPE_API_KEY,
  'cus_xxxxx'
);

const result = await generateText({
  model,
  messages: [
    { role: 'user', content: 'What is the capital of France?' },
    { role: 'assistant', content: 'The capital of France is Paris.' },
    { role: 'user', content: 'What is its population?' },
  ],
});
```

### Using different providers

```typescript
import { meteredModel } from '@stripe/ai-sdk/meter';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';

const STRIPE_API_KEY = process.env.STRIPE_API_KEY;
const CUSTOMER_ID = 'cus_xxxxx';

// OpenAI
const gptModel = meteredModel(
  openai('gpt-4o-mini'),
  STRIPE_API_KEY,
  CUSTOMER_ID
);

// Anthropic
const claudeModel = meteredModel(
  anthropic('claude-3-5-haiku-20241022'),
  STRIPE_API_KEY,
  CUSTOMER_ID
);

// Google
const geminiModel = meteredModel(
  google('gemini-2.5-flash'),
  STRIPE_API_KEY,
  CUSTOMER_ID
);
```

## How it works

The wrapper intercepts calls to the underlying language model and:

1. **Forwards the Request**: Passes all parameters to the original model unchanged
2. **Captures Usage**: Extracts token usage information from the response
3. **Reports to Stripe**: Sends meter events to Stripe asynchronously
4. **Returns Response**: Returns the original response without modification

For streaming responses, the wrapper collects usage information from the final stream chunk and reports it after the stream completes.

## Stripe meter events

Each API call generates meter events sent to Stripe:

**Input tokens event:**
```javascript
{
  event_name: 'token-billing-tokens',
  payload: {
    stripe_customer_id: 'cus_xxxxx',
    value: '100',
    model: 'openai/gpt-4o-mini',
    token_type: 'input'
  }
}
```

**Output tokens event:**
```javascript
{
  event_name: 'token-billing-tokens',
  payload: {
    stripe_customer_id: 'cus_xxxxx',
    value: '50',
    model: 'openai/gpt-4o-mini',
    token_type: 'output'
  }
}
```

## Error handling

The wrapper handles errors gracefully:

- **Invalid Models**: TypeScript prevents usage of v1 models at compile time
- **Missing Customer ID**: Throws an error immediately
- **Stripe API Errors**: Logged to console but don't interrupt AI generation
- **Missing Usage Data**: Handles responses without usage information

## Additional resources

- [Stripe Meter Events Documentation](https://docs.stripe.com/api/billing/meter-event)
- [Stripe Token Billing Documentation](https://docs.stripe.com/billing/token-billing)
- [Vercel AI SDK Documentation](https://sdk.vercel.ai/docs)
- [AI SDK Providers](https://sdk.vercel.ai/docs/providers)
- [Example Applications](./examples/)

