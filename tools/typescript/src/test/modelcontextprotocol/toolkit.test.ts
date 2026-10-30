import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {createStripeAgentToolkit} from '@/modelcontextprotocol/toolkit';

jest.mock('@/shared/mcp-client', () => ({
  StripeMcpClient: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    getTools: jest.fn().mockReturnValue([
      {
        name: 'create_refund',
        title: 'Create a refund',
        description: 'Refund a payment',
        inputSchema: {
          type: 'object',
          properties: {
            payment_intent: {type: 'string'},
          },
          required: ['payment_intent'],
        },
        annotations: {
          readOnlyHint: false,
          destructiveHint: true,
          idempotentHint: false,
          openWorldHint: false,
        },
      },
    ]),
    callTool: jest.fn().mockResolvedValue('{}'),
    disconnect: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('StripeAgentToolkit MCP proxy', () => {
  it('preserves remote tool titles and annotations', async () => {
    const toolkit = await createStripeAgentToolkit({
      secretKey: 'rk_test_123',
      configuration: {},
    });
    const client = new Client(
      {name: 'metadata-test-client', version: '1.0.0'},
      {capabilities: {}}
    );
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();

    try {
      await toolkit.connect(serverTransport);
      await client.connect(clientTransport);

      const {tools} = await client.listTools();

      expect(tools).toHaveLength(1);
      expect(tools[0]).toMatchObject({
        name: 'create_refund',
        title: 'Create a refund',
        annotations: {
          readOnlyHint: false,
          destructiveHint: true,
          idempotentHint: false,
          openWorldHint: false,
        },
      });
    } finally {
      await client.close();
      await toolkit.close();
    }
  });
});
