import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import Stripe from 'stripe';
import {
  CustomerBillingPortalClient,
  CustomerBillingRequestContext,
  registerCustomerBillingTools,
  RegisterCustomerBillingToolsOptions,
} from '@/customer-billing';

type RegisteredTool = {
  config: {
    inputSchema?: Record<string, unknown>;
    annotations?: Record<string, boolean>;
  };
  callback: (
    input: Record<string, unknown>,
    context: CustomerBillingRequestContext
  ) => Promise<{content: Array<{type: string; text: string}>}>;
};

function createServer() {
  const tools = new Map<string, RegisteredTool>();
  const server = {
    registerTool: jest.fn(
      (name: string, config: RegisteredTool['config'], callback: any) => {
        tools.set(name, {config, callback});
      }
    ),
  } as unknown as McpServer;
  return {server, tools};
}

function createContext(subject: string): CustomerBillingRequestContext {
  return {
    requestId: subject,
    authInfo: {token: 'request-token', clientId: subject, scopes: []},
    sendNotification: jest.fn(),
    sendRequest: jest.fn(),
  } as unknown as CustomerBillingRequestContext;
}

function createPortalClient(): jest.Mocked<CustomerBillingPortalClient> {
  return {
    getBillingOverview: jest.fn().mockResolvedValue({subscriptions: []}),
    listInvoices: jest.fn().mockResolvedValue({invoices: []}),
    previewSubscriptionChange: jest.fn().mockResolvedValue({total: 1200}),
    updateSubscription: jest.fn().mockResolvedValue({status: 'active'}),
    cancelSubscription: jest.fn().mockResolvedValue({status: 'canceled'}),
    updateBillingDetails: jest.fn().mockResolvedValue({updated: true}),
    openPaymentMethodUpdate: jest
      .fn()
      .mockResolvedValue({url: 'https://billing.example/update'}),
  };
}

function createOptions(
  overrides: Partial<RegisterCustomerBillingToolsOptions> = {}
): RegisterCustomerBillingToolsOptions {
  return {
    stripe: {} as Stripe,
    resolveCustomer: jest.fn((context) => ({
      customer: `customer-for-${String(context.requestId)}`,
    })),
    createPortalSession: jest.fn().mockResolvedValue({
      clientSecret: 'short-lived-credential',
      expiresAt: Date.now() + 60000,
    }),
    portalClient: createPortalClient(),
    ...overrides,
  };
}

function parsedResult(callResult: {content: Array<{text: string}>}) {
  return JSON.parse(callResult.content[0].text);
}

describe('registerCustomerBillingTools', () => {
  it('requires exactly one credential provider', () => {
    const {server} = createServer();
    expect(() =>
      registerCustomerBillingTools(
        server,
        createOptions({createPortalSession: undefined})
      )
    ).toThrow('exactly one');
    expect(() =>
      registerCustomerBillingTools(
        server,
        createOptions({getPortalSessionCredential: jest.fn()})
      )
    ).toThrow('exactly one');
  });

  it('registers only static read tools when authorization is absent', () => {
    const {server, tools} = createServer();
    registerCustomerBillingTools(server, createOptions());

    expect([...tools.keys()]).toEqual([
      'get_billing_overview',
      'list_invoices',
      'preview_subscription_change',
      'open_payment_method_update',
    ]);
    for (const tool of tools.values()) {
      expect(tool.config.annotations).toMatchObject({readOnlyHint: true});
      expect(tool.config.inputSchema).not.toHaveProperty('customer');
      expect(tool.config.inputSchema).not.toHaveProperty('client_secret');
    }
  });

  it('registers annotated write tools only with an authorization callback', () => {
    const {server, tools} = createServer();
    registerCustomerBillingTools(
      server,
      createOptions({authorizeAction: jest.fn()})
    );

    expect(tools.get('update_subscription')?.config.annotations).toMatchObject({
      readOnlyHint: false,
      destructiveHint: false,
    });
    expect(tools.get('cancel_subscription')?.config.annotations).toMatchObject({
      readOnlyHint: false,
      destructiveHint: true,
    });
    expect(tools.has('update_billing_details')).toBe(true);
  });

  it('resolves a new customer and session for every request', async () => {
    const {server, tools} = createServer();
    const portalClient = createPortalClient();
    const options = createOptions({portalClient});
    registerCustomerBillingTools(server, options);

    const handler = tools.get('get_billing_overview')!.callback;
    await Promise.all([
      handler({}, createContext('subject-a')),
      handler({}, createContext('subject-b')),
    ]);

    expect(options.resolveCustomer).toHaveBeenCalledTimes(2);
    expect(options.createPortalSession!).toHaveBeenCalledTimes(2);
    expect(portalClient.getBillingOverview).toHaveBeenCalledTimes(2);
    const customers = portalClient.getBillingOverview.mock.calls.map(
      ([request]) => request.customer
    );
    expect(customers).toEqual(
      expect.arrayContaining([
        'customer-for-subject-a',
        'customer-for-subject-b',
      ])
    );
  });

  it('accepts request-scoped credentials from an external provider', async () => {
    const {server, tools} = createServer();
    const portalClient = createPortalClient();
    const getPortalSessionCredential = jest.fn().mockResolvedValue({
      clientSecret: 'provided-credential',
      expiresAt: Date.now() + 60000,
    });
    const options = createOptions({
      createPortalSession: undefined,
      getPortalSessionCredential,
      portalClient,
    });
    registerCustomerBillingTools(server, options);

    const context = createContext('subject');
    await tools.get('get_billing_overview')!.callback({}, context);

    expect(getPortalSessionCredential).toHaveBeenCalledWith(
      context,
      expect.objectContaining({customer: 'customer-for-subject'})
    );
    expect(portalClient.getBillingOverview).toHaveBeenCalledWith(
      expect.objectContaining({
        credential: expect.objectContaining({
          clientSecret: 'provided-credential',
        }),
      })
    );
  });

  it('propagates trusted account and configuration context', async () => {
    const {server, tools} = createServer();
    const portalClient = createPortalClient();
    const options = createOptions({
      portalClient,
      account: 'connected-account-reference',
      configuration: 'portal-configuration-reference',
      onBehalfOf: 'settlement-account-reference',
    });
    registerCustomerBillingTools(server, options);

    await tools
      .get('list_invoices')!
      .callback({limit: 5}, createContext('subject'));

    expect(portalClient.listInvoices).toHaveBeenCalledWith(
      expect.objectContaining({
        account: 'connected-account-reference',
        configuration: 'portal-configuration-reference',
        onBehalfOf: 'settlement-account-reference',
        limit: 5,
      })
    );
  });

  it('previews, authorizes, and then performs subscription updates', async () => {
    const {server, tools} = createServer();
    const authorizeAction = jest.fn().mockResolvedValue(true);
    const portalClient = createPortalClient();
    registerCustomerBillingTools(
      server,
      createOptions({authorizeAction, portalClient})
    );

    await tools.get('update_subscription')!.callback(
      {
        subscription_id: 'subscription-reference',
        price_id: 'price-reference',
        quantity: 2,
      },
      createContext('subject')
    );

    expect(portalClient.previewSubscriptionChange).toHaveBeenCalledTimes(1);
    expect(authorizeAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'update_subscription',
        preview: {total: 1200},
      })
    );
    expect(portalClient.updateSubscription).toHaveBeenCalledTimes(1);
    expect(
      portalClient.previewSubscriptionChange.mock.invocationCallOrder[0]
    ).toBeLessThan(authorizeAction.mock.invocationCallOrder[0]);
    expect(authorizeAction.mock.invocationCallOrder[0]).toBeLessThan(
      portalClient.updateSubscription.mock.invocationCallOrder[0]
    );
  });

  it('does not perform a write when authorization is denied', async () => {
    const {server, tools} = createServer();
    const portalClient = createPortalClient();
    registerCustomerBillingTools(
      server,
      createOptions({
        portalClient,
        authorizeAction: jest.fn().mockResolvedValue(false),
      })
    );

    await expect(
      tools.get('cancel_subscription')!.callback(
        {
          subscription_id: 'subscription-reference',
          cancel_at_period_end: true,
        },
        createContext('subject')
      )
    ).rejects.toThrow('not authorized');
    expect(portalClient.cancelSubscription).not.toHaveBeenCalled();
  });

  it('removes credentials and customer data from results and errors', async () => {
    const {server, tools} = createServer();
    const portalClient = createPortalClient();
    portalClient.getBillingOverview.mockResolvedValueOnce({
      customer: 'customer-reference',
      email: 'private-value',
      client_secret: 'short-lived-credential',
      status: 'active',
    });
    registerCustomerBillingTools(server, createOptions({portalClient}));

    const response = await tools
      .get('get_billing_overview')!
      .callback({}, createContext('subject'));
    expect(parsedResult(response)).toEqual({status: 'active'});

    portalClient.getBillingOverview.mockRejectedValueOnce(
      new Error('Request failed with short-lived-credential')
    );
    await expect(
      tools.get('get_billing_overview')!.callback({}, createContext('subject'))
    ).rejects.toThrow('Request failed with [redacted]');
  });

  it('rejects resolver failures and credentials that are expired', async () => {
    const first = createServer();
    registerCustomerBillingTools(
      first.server,
      createOptions({
        resolveCustomer: jest.fn().mockRejectedValue(new Error('No mapping')),
      })
    );
    await expect(
      first.tools
        .get('get_billing_overview')!
        .callback({}, createContext('subject'))
    ).rejects.toThrow('No mapping');

    const second = createServer();
    const portalClient = createPortalClient();
    registerCustomerBillingTools(
      second.server,
      createOptions({
        now: () => 100000,
        portalClient,
        createPortalSession: jest.fn().mockResolvedValue({
          clientSecret: 'expired-credential',
          expiresAt: 100,
        }),
      })
    );
    await expect(
      second.tools
        .get('get_billing_overview')!
        .callback({}, createContext('subject'))
    ).rejects.toThrow('expired');
    expect(portalClient.getBillingOverview).not.toHaveBeenCalled();
  });

  it('bounds arrays returned by portal methods', async () => {
    const {server, tools} = createServer();
    const portalClient = createPortalClient();
    portalClient.listInvoices.mockResolvedValueOnce({
      invoices: Array.from({length: 25}, (_, index) => ({index})),
    });
    registerCustomerBillingTools(server, createOptions({portalClient}));

    const response = await tools
      .get('list_invoices')!
      .callback({limit: 20}, createContext('subject'));
    expect(parsedResult(response).invoices).toHaveLength(20);
  });
});
