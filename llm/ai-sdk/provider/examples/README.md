# Stripe AI SDK Provider Examples

> **Deprecated:** This package is no longer maintained and will receive no further updates, including security fixes. See the current [Stripe Token Billing documentation](https://docs.stripe.com/billing/token-billing) for integration guidance. [Final source](https://github.com/stripe/ai/tree/ai-packages-final/llm/ai-sdk/provider/examples). Existing users with migration questions can contact [token-billing-team@stripe.com](mailto:token-billing-team@stripe.com).

The documentation below is retained for historical reference.

This directory contains examples demonstrating how to use the Stripe AI SDK Provider to interact with various LLM models through Stripe's `llm.stripe.com` proxy.

## Overview

The Stripe AI SDK Provider is a custom provider for the Vercel AI SDK that routes all requests through Stripe's LLM proxy, automatically tracking token usage for billing purposes.

## Setup

1. Install dependencies (from the ai-sdk-provider directory):
```bash
cd llm/ai-sdk-provider
npm install
```

2. **Set up environment variables** in the examples directory:
```bash
cd examples
cp .env.example .env
```

Then edit `.env` and add your credentials:
```bash
# Required: Your Stripe API key
STRIPE_API_KEY=sk_test_...

# Required: Your Stripe Customer ID
STRIPE_CUSTOMER_ID=cus_...
```

## Running examples

Each example file demonstrates different use cases. Run them from the examples directory:

### OpenAI models
```bash
cd examples
npx ts-node openai.ts
```

Examples include:
- Simple text generation
- Streaming responses
- Multi-turn conversations
- Reasoning models (o3)
- Tool calling

### Google Gemini models
```bash
npx ts-node google.ts
```

Examples include:
- Text generation with Gemini 2.5 Pro
- Streaming with Gemini Flash
- Using Gemini Lite models
- Custom headers

### Anthropic Claude models
```bash
npx ts-node anthropic.ts
```

Examples include:
- Simple text generation
- Streaming with Claude Opus
- Claude Sonnet and Haiku models
- Tool calling
- Per-call customer ID override

## Supported models

### OpenAI
- `openai/gpt-5`
- `openai/gpt-5-mini`
- `openai/gpt-5-nano`
- `openai/gpt-4.1`
- `openai/gpt-4.1-mini`
- `openai/gpt-4.1-nano`
- `openai/gpt-4o`
- `openai/gpt-4o-mini`
- `openai/o3`, `openai/o3-mini`, `openai/o3-pro`
- `openai/o1`, `openai/o1-mini`, `openai/o1-pro`

### Google Gemini
- `google/gemini-2.5-pro`
- `google/gemini-2.5-flash`
- `google/gemini-2.5-flash-lite`
- `google/gemini-2.0-flash`
- `google/gemini-2.0-flash-lite`

### Anthropic Claude
- `anthropic/claude-opus-4-1`
- `anthropic/claude-opus-4`
- `anthropic/claude-sonnet-4`
- `anthropic/claude-3-7-sonnet`
- `anthropic/claude-3-5-haiku`
- `anthropic/claude-3-haiku`

## Usage patterns

### Basic setup

```typescript
import { createStripe } from '@stripe/ai-sdk/provider';
import { generateText } from 'ai';

const stripeLLM = createStripe({
  apiKey: process.env.STRIPE_API_KEY!,
  customerId: process.env.STRIPE_CUSTOMER_ID, // Optional default
});

const model = stripe('openai/gpt-5');
```

### Customer ID options

You can specify the customer ID in three ways (in order of priority):

1. **Per-call override** (highest priority):
```typescript
await generateText({
  model: stripe('openai/gpt-5'),
  prompt: 'Hello!',
  providerOptions: {
    stripe: {
      customerId: 'cus_override'
    }
  }
});
```

2. **Model-level setting**:
```typescript
const model = stripe('openai/gpt-5', {
  customerId: 'cus_model_level'
});
```

3. **Provider-level default**:
```typescript
const stripeLLM = createStripe({
  apiKey: '...',
  customerId: 'cus_default'
});
```

### Streaming

```typescript
import { streamText } from 'ai';

const result = await streamText({
  model: stripe('google/gemini-2.5-flash'),
  prompt: 'Tell me a story',
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
```

### Tool calling

```typescript
const result = await generateText({
  model: stripe('anthropic/claude-sonnet-4'),
  prompt: 'What is the weather?',
  tools: {
    getWeather: {
      description: 'Get weather for a location',
      parameters: {
        type: 'object',
        properties: {
          location: { type: 'string' }
        },
        required: ['location']
      },
      execute: async ({ location }) => {
        return { temperature: 72, condition: 'Sunny' };
      }
    }
  }
});
```

## How it works

1. All requests are routed to `https://llm.stripe.com/chat/completions`
2. Your Stripe API key is included as the `Authorization` header
3. The customer ID is included as the `X-Stripe-Customer-ID` header
4. Stripe automatically tracks token usage and bills the customer according to your Token Billing configuration

## Learn more

- [Stripe Token Billing Documentation](https://stripe.com/docs)
- [Vercel AI SDK Documentation](https://sdk.vercel.ai/docs)
- [AI SDK Provider Specification](https://github.com/vercel/ai/tree/main/packages/provider)

