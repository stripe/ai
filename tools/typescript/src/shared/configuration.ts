// Context are settings that are applied to all requests made by the integration.
export type Context = {
  // Account is a Stripe Connected Account ID. If set, the integration will
  // make requests for this Account.
  account?: string;

  // Customer is a Stripe Customer ID. If set, the integration will
  // make requests for this Customer.
  customer?: string;

  // If set to 'modelcontextprotocol', the Stripe API calls will use a special
  // header
  mode?: 'modelcontextprotocol' | 'toolkit';
};

// AdditionalMcpServer defines an external MCP server that provides
// supplementary tools alongside the core Stripe tools.
export type AdditionalMcpServer = {
  // Human-readable name for this server (used in logging and error messages)
  name: string;

  // The URL of the MCP server (e.g. 'https://mcp.spraay.app')
  url: string;

  // Optional headers to include with requests to this server
  headers?: Record<string, string>;
};

// Configuration provides various settings and options for the integration
// to tune and manage how it behaves.
export type Configuration = {
  context?: Context;

  // Additional MCP servers whose tools will be merged with the core Stripe
  // tools. This enables extending the toolkit with capabilities like batch
  // payments, cross-chain transfers, and other payment infrastructure that
  // complements the Stripe API.
  additionalMcpServers?: AdditionalMcpServer[];
};
