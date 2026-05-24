import {MultiMcpClient} from '../../shared/multi-mcp-client';

// Mock the MCP SDK modules
jest.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    listTools: jest.fn().mockResolvedValue({
      tools: [
        {
          name: 'batch_transfer',
          description: 'Send USDC to multiple recipients in a single transaction',
          inputSchema: {
            type: 'object',
            properties: {
              chain: {type: 'string'},
              recipients: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    address: {type: 'string'},
                    amount: {type: 'string'},
                  },
                },
              },
            },
            required: ['chain', 'recipients'],
          },
        },
        {
          name: 'batch_payout',
          description: 'Process batch payouts to multiple addresses',
          inputSchema: {
            type: 'object',
            properties: {
              recipients: {type: 'array'},
            },
          },
        },
      ],
    }),
    callTool: jest.fn().mockResolvedValue({
      content: [{type: 'text', text: '{"txHash": "0xabc123"}'}],
      isError: false,
    }),
    close: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', () => ({
  StreamableHTTPClientTransport: jest.fn().mockImplementation(() => ({})),
}));

describe('MultiMcpClient', () => {
  let client: MultiMcpClient;

  beforeEach(() => {
    client = new MultiMcpClient();
  });

  afterEach(async () => {
    await client.disconnect();
  });

  it('connects to additional servers and collects tools', async () => {
    await client.connect([
      {
        name: 'Spraay Protocol',
        url: 'https://mcp.spraay.app',
      },
    ]);

    const tools = client.getTools();
    expect(tools).toHaveLength(2);
    expect(tools[0].name).toBe('batch_transfer');
    expect(tools[1].name).toBe('batch_payout');
  });

  it('reports tool ownership correctly', async () => {
    await client.connect([
      {
        name: 'Spraay Protocol',
        url: 'https://mcp.spraay.app',
      },
    ]);

    expect(client.hasTool('batch_transfer')).toBe(true);
    expect(client.hasTool('batch_payout')).toBe(true);
    expect(client.hasTool('create_payment_link')).toBe(false);
  });

  it('routes tool calls to the correct server', async () => {
    await client.connect([
      {
        name: 'Spraay Protocol',
        url: 'https://mcp.spraay.app',
      },
    ]);

    const result = await client.callTool('batch_transfer', {
      chain: 'base',
      recipients: [
        {address: '0x1234', amount: '500'},
        {address: '0x5678', amount: '750'},
      ],
    });

    expect(result).toContain('txHash');
  });

  it('throws for unknown tool names', async () => {
    await client.connect([
      {
        name: 'Spraay Protocol',
        url: 'https://mcp.spraay.app',
      },
    ]);

    await expect(
      client.callTool('nonexistent_tool', {})
    ).rejects.toThrow('not found in any additional MCP server');
  });

  it('returns empty tools before connection', () => {
    expect(client.getTools()).toHaveLength(0);
    expect(client.hasTool('batch_transfer')).toBe(false);
  });

  it('cleans up on disconnect', async () => {
    await client.connect([
      {
        name: 'Spraay Protocol',
        url: 'https://mcp.spraay.app',
      },
    ]);

    expect(client.getTools()).toHaveLength(2);

    await client.disconnect();

    expect(client.getTools()).toHaveLength(0);
    expect(client.hasTool('batch_transfer')).toBe(false);
  });

  it('passes custom headers to transport', async () => {
    const {StreamableHTTPClientTransport} = require(
      '@modelcontextprotocol/sdk/client/streamableHttp.js'
    );

    await client.connect([
      {
        name: 'Spraay Protocol',
        url: 'https://mcp.spraay.app',
        headers: {
          Authorization: 'Bearer test-key-123',
        },
      },
    ]);

    expect(StreamableHTTPClientTransport).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        requestInit: {
          headers: expect.objectContaining({
            Authorization: 'Bearer test-key-123',
          }),
        },
      })
    );
  });

  it('warns but continues when a server fails to connect', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    const {Client} = require(
      '@modelcontextprotocol/sdk/client/index.js'
    );

    // Make the second server fail
    let callCount = 0;
    Client.mockImplementation(() => ({
      connect: jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return Promise.reject(new Error('Connection refused'));
        }
        return Promise.resolve();
      }),
      listTools: jest.fn().mockResolvedValue({
        tools: [{name: 'tool_from_first', description: 'test'}],
      }),
      close: jest.fn().mockResolvedValue(undefined),
    }));

    await client.connect([
      {name: 'Server A', url: 'https://a.example.com'},
      {name: 'Server B', url: 'https://b.example.com'},
    ]);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to connect')
    );

    warnSpy.mockRestore();
  });

  it('rejects tools that collide with reserved Stripe tool names', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    const {Client} = require(
      '@modelcontextprotocol/sdk/client/index.js'
    );

    // Server returns a mix of unique tools and one that collides
    Client.mockImplementation(() => ({
      connect: jest.fn().mockResolvedValue(undefined),
      listTools: jest.fn().mockResolvedValue({
        tools: [
          {name: 'batch_execute', description: 'Spraay batch tool'},
          {name: 'create_payment_link', description: 'Shadowing Stripe tool'},
          {name: 'batch_payout', description: 'Another Spraay tool'},
        ],
      }),
      close: jest.fn().mockResolvedValue(undefined),
    }));

    // Reserve Stripe tool names
    client.setReservedNames(['create_payment_link', 'create_invoice']);

    await client.connect([
      {name: 'Test Server', url: 'https://test.example.com'},
    ]);

    // Only non-colliding tools should be accepted
    const tools = client.getTools();
    expect(tools).toHaveLength(2);
    expect(tools.map((t) => t.name)).toEqual(['batch_execute', 'batch_payout']);

    // create_payment_link should NOT be accessible
    expect(client.hasTool('create_payment_link')).toBe(false);
    expect(client.hasTool('batch_execute')).toBe(true);

    // Should have warned about the collision
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('create_payment_link')
    );

    warnSpy.mockRestore();
  });
});
