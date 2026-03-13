/**
 * Tests for AI SDK billing wrapper V3 with Google Gemini models
 * Uses mock V3 models to verify meter events are sent correctly
 */

import Stripe from 'stripe';
import {meteredModel} from '../index';

jest.mock('stripe');

function createMockV3Model(
  modelId: string,
  provider: string = 'google.generative-ai'
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

describe('AI SDK Billing Wrapper V3 - Google Gemini', () => {
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

  it('should send meter events for doGenerate with Gemini V3', async () => {
    const originalModel = createMockV3Model('gemini-2.5-flash');
    originalModel.doGenerate.mockResolvedValue({
      content: [{type: 'text', text: 'Hello from Gemini!'}],
      finishReason: {unified: 'stop', raw: 'STOP'},
      usage: {
        inputTokens: {total: 15, noCache: undefined, cacheRead: undefined, cacheWrite: undefined},
        outputTokens: {total: 7, text: undefined, reasoning: undefined},
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
          value: '15',
          model: 'google/gemini-2.5-flash',
          token_type: 'input',
        }),
      })
    );

    expect(mockMeterEventsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          value: '7',
          model: 'google/gemini-2.5-flash',
          token_type: 'output',
        }),
      })
    );
  });

  it('should handle different Gemini model variants', async () => {
    const models = [
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-2.0-flash-exp',
      'gemini-1.5-pro',
    ];

    for (const modelName of models) {
      mockMeterEventsCreate.mockClear();

      const originalModel = createMockV3Model(modelName);
      originalModel.doGenerate.mockResolvedValue({
        content: [{type: 'text', text: 'Test'}],
        finishReason: {unified: 'stop', raw: 'STOP'},
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
            model: `google/${modelName}`,
          }),
        })
      );
    }
  });

  it('should preserve model properties', () => {
    const originalModel = createMockV3Model('gemini-2.5-flash');
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

  it('should handle zero token usage', async () => {
    const originalModel = createMockV3Model('gemini-2.5-flash');
    originalModel.doGenerate.mockResolvedValue({
      content: [{type: 'text', text: ''}],
      finishReason: {unified: 'stop', raw: 'STOP'},
      usage: {
        inputTokens: {total: 0, noCache: undefined, cacheRead: undefined, cacheWrite: undefined},
        outputTokens: {total: 0, text: undefined, reasoning: undefined},
      },
      warnings: [],
    });

    const wrappedModel = meteredModel(
      originalModel as any,
      TEST_API_KEY,
      'cus_test123'
    );

    await wrappedModel.doGenerate({
      prompt: [{role: 'user', content: [{type: 'text', text: ''}]}],
    } as any);

    await new Promise((resolve) => setImmediate(resolve));

    expect(mockMeterEventsCreate).toHaveBeenCalledTimes(0);
  });

  it('should handle streaming with V3 usage format', async () => {
    const originalModel = createMockV3Model('gemini-2.5-flash');

    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue({
          type: 'stream-start',
          warnings: [],
        });
        controller.enqueue({
          type: 'text-start',
          id: 'text-1',
        });
        controller.enqueue({
          type: 'text-delta',
          id: 'text-1',
          delta: 'Hello!',
        });
        controller.enqueue({
          type: 'text-end',
          id: 'text-1',
        });
        controller.enqueue({
          type: 'finish',
          finishReason: {unified: 'stop', raw: 'STOP'},
          usage: {
            inputTokens: {total: 10, noCache: undefined, cacheRead: undefined, cacheWrite: undefined},
            outputTokens: {total: 3, text: undefined, reasoning: undefined},
          },
        });
        controller.close();
      },
    });

    originalModel.doStream.mockResolvedValue({
      stream: mockStream,
      request: {body: {}},
      response: {headers: {}},
    });

    const wrappedModel = meteredModel(
      originalModel as any,
      TEST_API_KEY,
      'cus_test123'
    );

    const result = await wrappedModel.doStream({
      prompt: [{role: 'user', content: [{type: 'text', text: 'Test'}]}],
    } as any);

    const reader = (result as any).stream.getReader();
    const parts: any[] = [];
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      parts.push(value);
    }

    await new Promise((resolve) => setImmediate(resolve));

    expect(mockMeterEventsCreate).toHaveBeenCalledTimes(2);
    expect(mockMeterEventsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          value: '10',
          token_type: 'input',
        }),
      })
    );
    expect(mockMeterEventsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          value: '3',
          token_type: 'output',
        }),
      })
    );
  });
});
