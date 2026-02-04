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

// Configuration provides various settings and options for the integration
// to tune and manage how it behaves.
export type Configuration = {
  context?: Context;
};
