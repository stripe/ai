/**
 * Sample Usage: Anthropic with Usage Tracking
 * This demonstrates how to use the generic token meter to automatically report
 * token usage to Stripe for billing purposes with Anthropic.
 */

import {config} from 'dotenv';
import {resolve} from 'path';
import Anthropic from '@anthropic-ai/sdk';
import {createTokenMeter} from '..';

// Load .env from the examples folder
config({path: resolve(__dirname, '.env')});

// Load environment variables from .env file
const STRIPE_API_KEY = process.env.STRIPE_API_KEY!;
const STRIPE_CUSTOMER_ID = process.env.STRIPE_CUSTOMER_ID!;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;

// Initialize the standard Anthropic client (no wrapper needed!)
const anthropic = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
});

// Create the token meter
const meter = createTokenMeter(STRIPE_API_KEY);

// Sample 1: Basic Message Completion (non-streaming)
async function sampleBasicMessage() {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-5-5',
    max_tokens: 20,
    messages: [
      {role: 'user', content: 'Say "Hello, World!" and nothing else.'},
    ],
  });

  // Meter the response - auto-detects it's Anthropic!
  meter.trackUsage(response, STRIPE_CUSTOMER_ID);

  console.log('Response:', response.content[0]);
  console.log('Usage:', response.usage);
}

// Sample 2: Streaming Message Completion
async function sampleStreamingMessage() {
  const stream = await anthropic.messages.create({
    model: 'claude-sonnet-5-5',
    max_tokens: 50,
    messages: [
      {role: 'user', content: 'Count from 1 to 5, one number per line.'},
    ],
    stream: true,
  });

  // Wrap the stream for metering - auto-detects it's Anthropic!
  const meteredStream = meter.trackUsageStreamAnthropic(stream, STRIPE_CUSTOMER_ID);

  let fullContent = '';

  for await (const event of meteredStream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      const content = event.delta.text;
      fullContent += content;
      process.stdout.write(content);
    }
  }

  console.log('\n\nFull content:', fullContent);
}

// Sample 3: Message with Tools
async function sampleMessageWithTools() {
  const tools: any[] = [
    {
      name: 'get_weather',
      description: 'Get the current weather in a location',
      input_schema: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'The city and state, e.g. San Francisco, CA',
          },
          unit: {
            type: 'string',
            enum: ['celsius', 'fahrenheit'],
            description: 'The unit of temperature',
          },
        },
        required: ['location'],
      },
    },
  ];

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-5-5',
    max_tokens: 100,
    messages: [{role: 'user', content: 'What is the weather in New York?'}],
    tools,
  });

  // Meter the response - auto-detects it's Anthropic!
  meter.trackUsage(response, STRIPE_CUSTOMER_ID);

  console.log('Response:', JSON.stringify(response.content, null, 2));
  console.log('Usage:', response.usage);
}

// Sample 4: Message with System Prompt
async function sampleMessageWithSystem() {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-5-5',
    max_tokens: 50,
    system: 'You are a helpful assistant that speaks like a pirate.',
    messages: [{role: 'user', content: 'Tell me about Paris.'}],
  });

  // Meter the response - auto-detects it's Anthropic!
  meter.trackUsage(response, STRIPE_CUSTOMER_ID);

  console.log('Response:', response.content[0]);
  console.log('Usage:', response.usage);
}

// Sample 5: Multi-turn Conversation
async function sampleConversation() {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-5-5',
    max_tokens: 50,
    messages: [
      {role: 'user', content: 'What is the capital of France?'},
      {role: 'assistant', content: 'The capital of France is Paris.'},
      {role: 'user', content: 'What is its population?'},
    ],
  });

  // Meter the response - auto-detects it's Anthropic!
  meter.trackUsage(response, STRIPE_CUSTOMER_ID);

  console.log('Response:', response.content[0]);
  console.log('Usage:', response.usage);
}

// Run all samples
async function runAllSamples() {
  console.log('Starting Anthropic Usage Tracking Examples');
  console.log(
    'These examples show how to use the generic meter with Anthropic and Stripe billing\n'
  );

  try {
    console.log('\n' + '='.repeat(80));
    console.log('Sample 1: Basic Message');
    console.log('='.repeat(80));
    await sampleBasicMessage();

    console.log('\n' + '='.repeat(80));
    console.log('Sample 2: Streaming Message');
    console.log('='.repeat(80));
    await sampleStreamingMessage();

    console.log('\n' + '='.repeat(80));
    console.log('Sample 3: Message with Tools');
    console.log('='.repeat(80));
    await sampleMessageWithTools();

    console.log('\n' + '='.repeat(80));
    console.log('Sample 4: Message with System Prompt');
    console.log('='.repeat(80));
    await sampleMessageWithSystem();

    console.log('\n' + '='.repeat(80));
    console.log('Sample 5: Multi-turn Conversation');
    console.log('='.repeat(80));
    await sampleConversation();

    console.log('\n' + '='.repeat(80));
    console.log('All examples completed successfully!');
    console.log('='.repeat(80));
  } catch (error) {
    console.error('\n❌ Sample failed:', error);
    throw error;
  }
}

// Run the samples
runAllSamples().catch(console.error);

