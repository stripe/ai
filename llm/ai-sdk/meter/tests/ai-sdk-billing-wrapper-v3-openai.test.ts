/**
 * Tests for AI SDK billing wrapper V3 with OpenAI models
 * Uses mock V3 models to verify meter events are sent correctly
 */

import Stripe from 'stripe';
import {meteredModel} from '../index';

jest.mock('stripe');

function createMockV3Model(
  modelId: string,
  provider: string = 'openai.chat'
) {
  return {
    modelId,
    provider,
    specificationVersion: 'v3' as const,
    supportedUrls: {},
    doGenerate: jest.fn(),
    doStream: jest.fn(),
  };
}

describe('AI SDK Billing Wrapper V3 - OpenAI', () => {
  let mockMeterEventsCreate: jest.Mock;
  const TEST_API_KEY = 'sk_test_mock_key';

  beforeEach(() => {
    mockMeterEventsCreate = jest.fn().mockResolvedValue({});

    (Stripe as unknown as jest.Mock).mockImplementation(() => ({
      v2: {
        billing: {
          meterEvents: {
            create: mockMeterEventsCreate,
          },
        },
      },
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create wrapper that preserves model properties', () => {
    const originalModel = createMockV3Model('gpt-4o-mini');
    const wrappedModel = meteredModel(
      originalModel as any,
      TEST_API_KEY,
      'cus_test123'
    );

    expect(wrappedModel.modelId).toBe('gpt-4o-mini');
    expect(wrappedModel.provider).toBe('openai.chat');
    expect(wrappedModel.specificationVersion).toBe('v3');
  });

  it('should wrap doGenerate and send meter events with V3 usage format', async () => {
    const originalModel = createMockV3Model('gpt-4o-mini');
    originalModel.doGenerate.mockResolvedValue({
      content: [{type: 'text', text: 'Test response'}],
      finishReason: {unified: 'stop', raw: 'stop'},
      usage: {
        inputTokens: {
          total: 10,
          noCache: undefined,
          cacheRead: undefined,
          cacheWrite: undefined,
        },
        outputTokens: {
          total: 5,
          text: undefined,
          reasoning: undefined,
        },
      },
      warnings: [],
    });

    const wrappedModel = meteredModel(
      originalModel as any,
      TEST_API_KEY,
      'cus_test123'
    );

    const result = await wrappedModel.doGenerate({
      prompt: [{role: 'user', content: [{type: 'text', text: 'Test'}]}],
    } as any);

    expect((result as any).content[0].text).toBe('Test response');

    await new Promise((resolve) => setImmediate(resolve));

    expect(mockMeterEventsCreate).toHaveBeenCalledTimes(2);
    expect(mockMeterEventsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: 'token-billing-tokens',
        payload: expect.objectContaining({
          stripe_customer_id: 'cus_test123',
          value: '10',
          model: 'openai/gpt-4o-mini',
          token_type: 'input',
        }),
      })
    );
    expect(mockMeterEventsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: 'token-billing-tokens',
        payload: expect.objectContaining({
          value: '5',
          token_type: 'output',
        }),
      })
    );
  });

  it('should normalize OpenAI model names', async () => {
    const originalModel = createMockV3Model('gpt-4-turbo-2024-04-09');
    originalModel.doGenerate.mockResolvedValue({
      content: [{type: 'text', text: 'Test'}],
      finishReason: {unified: 'stop', raw: 'stop'},
      usage: {
        inputTokens: {total: 5, noCache: undefined, cacheRead: undefined, cacheWrite: undefined},
        outputTokens: {total: 2, text: undefined, reasoning: undefined},
      },
      warnings: [],
    });

    const wrappedModel = meteredModel(
      originalModel as any,
      TEST_API_KEY,
      'cus_test123'
    );

    await wrappedModel.doGenerate({
      prompt: [{role: 'user', content: [{type: 'text', text: 'Test'}]}],
    } as any);

    await new Promise((resolve) => setImmediate(resolve));

    // The meter-event-logging normalizes the model name (date suffix removed)
    expect(mockMeterEventsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          model: 'openai/gpt-4-turbo',
        }),
      })
    );
  });

  it('should handle missing usage gracefully', async () => {
    const originalModel = createMockV3Model('gpt-4o-mini');
    originalModel.doGenerate.mockResolvedValue({
      content: [{type: 'text', text: 'Test'}],
      finishReason: {unified: 'stop', raw: 'stop'},
      usage: undefined,
      warnings: [],
    });

    const wrappedModel = meteredModel(
      originalModel as any,
      TEST_API_KEY,
      'cus_test123'
    );

    await wrappedModel.doGenerate({
      prompt: [{role: 'user', content: [{type: 'text', text: 'Test'}]}],
    } as any);

    await new Promise((resolve) => setImmediate(resolve));

    expect(mockMeterEventsCreate).toHaveBeenCalledTimes(0);
  });

  it('should handle V3 usage with cache info', async () => {
    const originalModel = createMockV3Model('gpt-4o-mini');
    originalModel.doGenerate.mockResolvedValue({
      content: [{type: 'text', text: 'Test'}],
      finishReason: {unified: 'stop', raw: 'stop'},
      usage: {
        inputTokens: {
          total: 100,
          noCache: 80,
          cacheRead: 20,
          cacheWrite: 0,
        },
        outputTokens: {
          total: 50,
          text: 40,
          reasoning: 10,
        },
      },
      warnings: [],
    });

    const wrappedModel = meteredModel(
      originalModel as any,
      TEST_API_KEY,
      'cus_test123'
    );

    await wrappedModel.doGenerate({
      prompt: [{role: 'user', content: [{type: 'text', text: 'Test'}]}],
    } as any);

    await new Promise((resolve) => setImmediate(resolve));

    expect(mockMeterEventsCreate).toHaveBeenCalledTimes(2);
    expect(mockMeterEventsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          value: '100',
          token_type: 'input',
        }),
      })
    );
    expect(mockMeterEventsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          value: '50',
          token_type: 'output',
        }),
      })
    );
  });
});
