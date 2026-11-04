# Stripe Token Meter

> **Deprecated:** This package is no longer maintained and will receive no further updates, including security fixes. See the current [Stripe Token Billing documentation](https://docs.stripe.com/billing/token-billing) for integration guidance. [Final source](https://github.com/stripe/ai/tree/ai-packages-final/llm/token-meter). Existing users with migration questions can contact [token-billing-team@stripe.com](mailto:token-billing-team@stripe.com).

The documentation below is retained for historical reference.

Generic token metering for native AI SDKs with automatic Stripe billing integration. Track and bill token usage from OpenAI, Anthropic, and Google Gemini without any framework dependencies.

## Private preview access required

Stripe Billing for LLM Tokens is currently only available to organizations participating in the Billing for LLM Tokens Private Preview. If you do not have access and would like to request it, please visit:

**[Request Access to Billing for LLM Tokens Private Preview](https://docs.stripe.com/billing/token-billing)**

## Why use Stripe Token Meter?

- **Native SDK Support**: Works directly with native AI SDKs (OpenAI, Anthropic, Google)
- **No Framework Required**: Direct integration without Vercel AI SDK or other frameworks
- **Automatic Detection**: Automatically detects provider and response types
- **Streaming Support**: Full support for streaming responses from all providers
- **Fire-and-Forget**: Billing events are sent asynchronously without blocking
- **Universal API**: Single interface works across all supported providers

## Installation

```bash
npm install @stripe/token-meter
```

## Supported providers

- **OpenAI**: Chat Completions, Responses API, Embeddings (streaming and non-streaming)
- **Anthropic**: Messages API (streaming and non-streaming)
- **Google Gemini**: GenerateContent API (streaming and non-streaming)

## Quick start

### OpenAI

```typescript
import OpenAI from 'openai';
import { createTokenMeter } from '@stripe/token-meter';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const meter = createTokenMeter(process.env.STRIPE_API_KEY);

// Non-streaming
const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Hello!' }],
});

meter.trackUsage(response, 'cus_xxxxx');
```

### Anthropic

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { createTokenMeter } from '@stripe/token-meter';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const meter = createTokenMeter(process.env.STRIPE_API_KEY);

// Non-streaming
const response = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Hello!' }],
});

meter.trackUsage(response, 'cus_xxxxx');
```

### Google Gemini

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createTokenMeter } from '@stripe/token-meter';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const meter = createTokenMeter(process.env.STRIPE_API_KEY);

const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
const response = await model.generateContent('Hello!');

meter.trackUsage(response.response, 'cus_xxxxx');
```

## API reference

### `createTokenMeter(stripeApiKey, config?)`

Creates a token meter instance for tracking usage.

**Parameters:**
- `stripeApiKey` (string): Your Stripe API key
- `config` (optional): Configuration options
  - `meterEventName` (string): Custom meter event name (default: 'token-billing-tokens')

**Returns:** TokenMeter instance

### `TokenMeter.trackUsage(response, customerId)`

Tracks usage from a non-streaming response (fire-and-forget).

**Parameters:**
- `response`: The response object from OpenAI, Anthropic, or Google
- `customerId` (string): Stripe customer ID to attribute usage to

**Supported response types:**
- `OpenAI.ChatCompletion`
- `OpenAI.Responses.Response`
- `OpenAI.CreateEmbeddingResponse`
- `Anthropic.Messages.Message`
- `GenerateContentResult` (Gemini)

### `TokenMeter.trackUsageStreamOpenAI(stream, customerId)`

Wraps an OpenAI streaming response for usage tracking.

**Parameters:**
- `stream`: OpenAI stream (Chat Completions or Responses API)
- `customerId` (string): Stripe customer ID

**Returns:** The wrapped stream (can be consumed normally)

**Important:** For OpenAI streaming, include `stream_options: { include_usage: true }` in your request.

### `TokenMeter.trackUsageStreamAnthropic(stream, customerId)`

Wraps an Anthropic streaming response for usage tracking.

**Parameters:**
- `stream`: Anthropic message stream
- `customerId` (string): Stripe customer ID

**Returns:** The wrapped stream (can be consumed normally)

### `TokenMeter.trackUsageStreamGemini(stream, customerId, modelName)`

Wraps a Google Gemini streaming response for usage tracking.

**Parameters:**
- `stream`: Gemini streaming result
- `customerId` (string): Stripe customer ID
- `modelName` (string): Model name (e.g., 'gemini-2.5-flash')

**Returns:** The wrapped stream (can be consumed normally)

## Examples

### OpenAI streaming

```typescript
import OpenAI from 'openai';
import { createTokenMeter } from '@stripe/token-meter';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const meter = createTokenMeter(process.env.STRIPE_API_KEY);

const stream = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Count to 5' }],
  stream: true,
  stream_options: { include_usage: true }, // Required for metering
});

const meteredStream = meter.trackUsageStreamOpenAI(stream, 'cus_xxxxx');

for await (const chunk of meteredStream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}
```

### Anthropic streaming

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { createTokenMeter } from '@stripe/token-meter';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const meter = createTokenMeter(process.env.STRIPE_API_KEY);

const stream = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Count to 5' }],
  stream: true,
});

const meteredStream = meter.trackUsageStreamAnthropic(stream, 'cus_xxxxx');

for await (const event of meteredStream) {
  if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
    process.stdout.write(event.delta.text);
  }
}
```

### Google Gemini streaming

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createTokenMeter } from '@stripe/token-meter';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const meter = createTokenMeter(process.env.STRIPE_API_KEY);

const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
const result = await model.generateContentStream('Count to 5');

const meteredStream = meter.trackUsageStreamGemini(
  result,
  'cus_xxxxx',
  'gemini-2.5-flash'
);

for await (const chunk of meteredStream.stream) {
  process.stdout.write(chunk.text());
}
```

### OpenAI Responses API

```typescript
import OpenAI from 'openai';
import { createTokenMeter } from '@stripe/token-meter';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const meter = createTokenMeter(process.env.STRIPE_API_KEY);

const response = await openai.responses.create({
  model: 'gpt-4o-mini',
  input: 'What is 2+2?',
  instructions: 'You are a helpful math assistant.',
});

meter.trackUsage(response, 'cus_xxxxx');
console.log('Output:', response.output);
```

### OpenAI embeddings

```typescript
import OpenAI from 'openai';
import { createTokenMeter } from '@stripe/token-meter';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const meter = createTokenMeter(process.env.STRIPE_API_KEY);

const response = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: 'Hello, world!',
});

meter.trackUsage(response, 'cus_xxxxx');
console.log('Embedding dimensions:', response.data[0].embedding.length);
```

## How it works

The token meter:

1. **Detects Provider**: Automatically identifies the AI provider from the response
2. **Extracts Usage**: Pulls token counts from the response object
3. **Reports to Stripe**: Sends meter events asynchronously to Stripe
4. **Non-Blocking**: Never interrupts your application flow

For streaming responses, the meter wraps the stream and reports usage after the stream completes.

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

The token meter handles errors gracefully:

- **Stripe API Errors**: Logged to console but don't interrupt your application
- **Missing Usage Data**: Handles responses without usage information
- **Invalid Provider**: Logs a warning for unrecognized providers

## TypeScript support

Full TypeScript support with type definitions for all providers:

```typescript
import type { TokenMeter, SupportedResponse, SupportedStream } from '@stripe/token-meter';
```

## Comparison with AI SDK Meter

### Use Token Meter when
- You're using native SDKs (OpenAI, Anthropic, Google) directly
- You don't want to depend on Vercel AI SDK
- You need maximum control over API parameters
- You're working with embeddings or specialized APIs

### Use AI SDK Meter when
- You're already using Vercel AI SDK
- You want a unified interface across providers
- You need AI SDK-specific features (tool calling abstractions, etc.)
- You prefer the AI SDK's streaming abstractions

## Additional resources

- [Stripe Meter Events Documentation](https://docs.stripe.com/api/billing/meter-event)
- [Stripe Token Billing Documentation](https://docs.stripe.com/billing/token-billing)
- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
- [Anthropic API Documentation](https://docs.anthropic.com/claude/reference)
- [Google Gemini API Documentation](https://ai.google.dev/docs)
- [Example Applications](./examples/)

## License

MIT

