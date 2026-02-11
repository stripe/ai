import {StripeMcpClient} from '@/shared/mcp-client';

// Mock the MCP SDK
jest.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    listTools: jest.fn().mockResolvedValue({
      tools: [
        {
          name: 'create_customer',
          description: 'Create a new customer',
          inputSchema: {
            type: 'object',
            properties: {
              email: {type: 'string', description: 'Customer email'},
              name: {type: 'string', description: 'Customer name'},
            },
            required: ['email'],
          },
        },
        {
          name: 'list_customers',
          description: 'List all customers',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    }),
    callTool: jest.fn().mockResolvedValue({
      content: [{type: 'text', text: '{"id": "cus_123"}'}],
    }),
    close: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', () => ({
  StreamableHTTPClientTransport: jest.fn().mockImplementation(() => ({})),
}));

describe('StripeMcpClient', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw if no API key is provided', () => {
      expect(() => new StripeMcpClient({secretKey: ''})).toThrow(
        'API key is required.'
      );
    });

    it('should throw for invalid API key format', () => {
      expect(() => new StripeMcpClient({secretKey: 'invalid_key'})).toThrow(
        'Invalid API key format'
      );
    });

    it('should accept sk_* keys with recommendation warning', () => {
      const client = new StripeMcpClient({secretKey: 'sk_test_123'});
      expect(client).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('strongly recommend')
      );
    });

    it('should accept rk_* keys without warning', () => {
      const client = new StripeMcpClient({secretKey: 'rk_test_123'});
      expect(client).toBeDefined();
      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('connect', () => {
    it('should connect and fetch tools', async () => {
      const client = new StripeMcpClient({secretKey: 'rk_test_123'});

      expect(client.isConnected()).toBe(false);

      await client.connect();

      expect(client.isConnected()).toBe(true);
      const tools = client.getTools();
      expect(tools).toHaveLength(2);
      expect(tools[0].name).toBe('create_customer');
    });

    it('should not reconnect if already connected', async () => {
      const client = new StripeMcpClient({secretKey: 'rk_test_123'});

      await client.connect();
      await client.connect(); // Should not throw or call connect again

      expect(client.isConnected()).toBe(true);
    });

    it('should handle concurrent connect calls safely', async () => {
      const client = new StripeMcpClient({secretKey: 'rk_test_123'});

      // Call connect multiple times concurrently
      const results = await Promise.all([
        client.connect(),
        client.connect(),
        client.connect(),
      ]);

      // All should resolve without error
      expect(results).toHaveLength(3);
      expect(client.isConnected()).toBe(true);
    });
  });

  describe('getTools', () => {
    it('should throw if not connected', () => {
      const client = new StripeMcpClient({secretKey: 'rk_test_123'});

      expect(() => client.getTools()).toThrow(
        'MCP client not connected. Call connect() before accessing tools.'
      );
    });

    it('should return tools after connection', async () => {
      const client = new StripeMcpClient({secretKey: 'rk_test_123'});
      await client.connect();

      const tools = client.getTools();
      expect(tools).toBeDefined();
      expect(Array.isArray(tools)).toBe(true);
    });
  });

  describe('callTool', () => {
    it('should throw if not connected', async () => {
      const client = new StripeMcpClient({secretKey: 'rk_test_123'});

      await expect(
        client.callTool('create_customer', {email: 'test@example.com'})
      ).rejects.toThrow(
        'MCP client not connected. Call connect() before calling tools.'
      );
    });

    it('should call tool and return result', async () => {
      const client = new StripeMcpClient({secretKey: 'rk_test_123'});
      await client.connect();

      const result = await client.callTool('create_customer', {
        email: 'test@example.com',
      });

      expect(result).toBe('{"id": "cus_123"}');
    });
  });

  describe('disconnect', () => {
    it('should disconnect and clear state', async () => {
      const client = new StripeMcpClient({secretKey: 'rk_test_123'});
      await client.connect();

      expect(client.isConnected()).toBe(true);

      await client.disconnect();

      expect(client.isConnected()).toBe(false);
      expect(() => client.getTools()).toThrow('MCP client not connected');
    });

    it('should be safe to call disconnect when not connected', async () => {
      const client = new StripeMcpClient({secretKey: 'rk_test_123'});

      // Should not throw
      await client.disconnect();

      expect(client.isConnected()).toBe(false);
    });

    it('should allow reconnection after disconnect', async () => {
      const client = new StripeMcpClient({secretKey: 'rk_test_123'});

      await client.connect();
      expect(client.isConnected()).toBe(true);

      await client.disconnect();
      expect(client.isConnected()).toBe(false);

      await client.connect();
      expect(client.isConnected()).toBe(true);
    });
  });

  describe('context handling', () => {
    it('should pass account context in headers', async () => {
      const {
        StreamableHTTPClientTransport,
      } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');

      const client = new StripeMcpClient({
        secretKey: 'rk_test_123',
        context: {account: 'acct_123'},
      });

      // Transport is created at connect time, not constructor time
      await client.connect();

      expect(StreamableHTTPClientTransport).toHaveBeenCalledWith(
        expect.any(URL),
        expect.objectContaining({
          requestInit: expect.objectContaining({
            headers: expect.objectContaining({
              'Stripe-Account': 'acct_123',
            }),
          }),
        })
      );
    });
  });
});
