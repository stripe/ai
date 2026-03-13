/**
 * Tests for AI SDK billing wrapper V3 with Anthropic models
 * Uses mock V3 models to verify meter events are sent correctly
 */

import Stripe from 'stripe';
import {meteredModel} from '../index';

jest.mock('stripe');

function createMockV3Model(
  modelId: string,
  provider: string = 'anthropic.messages'
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

describe('AI SDK Billing Wrapper V3 - Anthropic', () => {
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

  it('should send meter events for doGenerate with Claude V3', async () => {
    const originalModel = createMockV3Model('claude-3-5-haiku-20241022');
    originalModel.doGenerate.mockResolvedValue({
      content: [{type: 'text', text: 'Hello from Claude!'}],
      finishReason: {unified: 'stop', raw: 'end_turn'},
      usage: {
        inputTokens: {total: 12, noCache: undefined, cacheRead: undefined, cacheWrite: undefined},
        outputTokens: {total: 6, text: undefined, reasoning: undefined},
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
        event_name: 'token-billing-tokens',
        payload: expect.objectContaining({
          stripe_customer_id: 'cus_test123',
          value: '12',
          model: 'anthropic/claude-3.5-haiku',
          token_type: 'input',
        }),
      })
    );

    expect(mockMeterEventsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          value: '6',
          model: 'anthropic/claude-3.5-haiku',
          token_type: 'output',
        }),
      })
    );
  });

  it('should normalize Anthropic model names correctly', async () => {
    const testCases = [
      {
        input: 'claude-3-5-haiku-20241022',
        expected: 'anthropic/claude-3.5-haiku',
      },
      {
        input: 'claude-3-5-sonnet-20241022',
        expected: 'anthropic/claude-3.5-sonnet',
      },
      {
        input: 'claude-3-opus-20240229',
        expected: 'anthropic/claude-3-opus',
      },
      {
        input: 'claude-sonnet-4-latest',
        expected: 'anthropic/claude-sonnet-4',
      },
    ];

    for (const {input, expected} of testCases) {
      mockMeterEventsCreate.mockClear();

      const originalModel = createMockV3Model(input);
      originalModel.doGenerate.mockResolvedValue({
        content: [{type: 'text', text: 'Test'}],
        finishReason: {unified: 'stop', raw: 'end_turn'},
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

      expect(mockMeterEventsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            model: expected,
          }),
        })
      );
    }
  });

  it('should preserve model properties', () => {
    const originalModel = createMockV3Model('claude-3-5-haiku-20241022');
    const wrappedModel = meteredModel(
      originalModel as any,
      TEST_API_KEY,
      'cus_test123'
    );

    expect(wrappedModel.modelId).toBe(originalModel.modelId);
    expect(wrappedModel.provider).toBe(originalModel.provider);
    expect(wrappedModel.specificationVersion).toBe(
      originalModel.specificationVersion
    );
  });

  it('should handle V3 usage with cache and reasoning tokens', async () => {
    const originalModel = createMockV3Model('claude-sonnet-4');
    originalModel.doGenerate.mockResolvedValue({
      content: [{type: 'text', text: 'Response with reasoning'}],
      finishReason: {unified: 'stop', raw: 'end_turn'},
      usage: {
        inputTokens: {
          total: 200,
          noCache: 150,
          cacheRead: 50,
          cacheWrite: 10,
        },
        outputTokens: {
          total: 100,
          text: 60,
          reasoning: 40,
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

    expect(mockMeterEventsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          value: '200',
          token_type: 'input',
        }),
      })
    );
    expect(mockMeterEventsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          value: '100',
          token_type: 'output',
        }),
      })
    );
  });
});
