import type {StripeToolDefinition} from './tools';

// Actions restrict the subset of API calls that can be made. They should
// be used in conjunction with Restricted API Keys. Setting a permission to false
// prevents the related "tool" from being considered.
export type Object =
  | 'customers'
  | 'disputes'
  | 'invoices'
  | 'invoiceItems'
  | 'paymentLinks'
  | 'products'
  | 'prices'
  | 'balance'
  | 'refunds'
  | 'paymentIntents'
  | 'subscriptions'
  | 'documentation'
  | 'coupons';

export type Permission = 'create' | 'update' | 'read';

export type Actions = {
  [K in Object]?: {
    [K in Permission]?: boolean;
  };
} & {
  balance?: {
    read?: boolean;
  };
};

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
  actions?: Actions;
  context?: Context;
};

export const isToolAllowed = (
  tool: StripeToolDefinition,
  configuration: Configuration
): boolean => {
  return Object.keys(tool.actions).every((resource) => {
    // For each resource.permission pair, check the configuration.
    // @ts-ignore
    const permissions = tool.actions[resource];

    return Object.keys(permissions).every((permission) => {
      // @ts-ignore
      return configuration.actions[resource]?.[permission] === true;
    });
  });
};

/**
 * Map tool names to their required permissions for MCP tools.
 * These match the method names returned by mcp.stripe.com.
 *
 * SECURITY NOTE: Tools not listed in this map are ALLOWED BY DEFAULT.
 * This means if mcp.stripe.com adds new tools, they will bypass client-side
 * permission filtering until this map is updated. This is intentional to
 * avoid breaking new functionality, but means the server-side permissions
 * (via restricted API keys) are the primary security boundary.
 *
 * To maintain security:
 * 1. Always use restricted API keys (rk_*) with minimal permissions
 * 2. Update this map when new tools are added to mcp.stripe.com
 * 3. Consider the actions configuration as a convenience filter, not a security boundary
 */
const toolPermissionMap: Record<
  string,
  Array<{resource: Object; permission: Permission}>
> = {
  create_customer: [{resource: 'customers', permission: 'create'}],
  list_customers: [{resource: 'customers', permission: 'read'}],
  create_product: [{resource: 'products', permission: 'create'}],
  list_products: [{resource: 'products', permission: 'read'}],
  create_price: [{resource: 'prices', permission: 'create'}],
  list_prices: [{resource: 'prices', permission: 'read'}],
  create_payment_link: [{resource: 'paymentLinks', permission: 'create'}],
  create_invoice: [{resource: 'invoices', permission: 'create'}],
  list_invoices: [{resource: 'invoices', permission: 'read'}],
  finalize_invoice: [{resource: 'invoices', permission: 'update'}],
  create_invoice_item: [{resource: 'invoiceItems', permission: 'create'}],
  retrieve_balance: [{resource: 'balance', permission: 'read'}],
  create_refund: [{resource: 'refunds', permission: 'create'}],
  list_payment_intents: [{resource: 'paymentIntents', permission: 'read'}],
  list_subscriptions: [{resource: 'subscriptions', permission: 'read'}],
  cancel_subscription: [{resource: 'subscriptions', permission: 'update'}],
  update_subscription: [{resource: 'subscriptions', permission: 'update'}],
  search_documentation: [{resource: 'documentation', permission: 'read'}],
  list_coupons: [{resource: 'coupons', permission: 'read'}],
  create_coupon: [{resource: 'coupons', permission: 'create'}],
  list_disputes: [{resource: 'disputes', permission: 'read'}],
  update_dispute: [{resource: 'disputes', permission: 'update'}],
};

/**
 * Check if a tool is allowed by its method name.
 * Used for filtering MCP tools that come from the remote server.
 * @param toolName - The tool method name (e.g., 'create_customer')
 * @param configuration - The configuration with actions permissions
 * @returns true if the tool is allowed, false otherwise
 */
export const isToolAllowedByName = (
  toolName: string,
  configuration: Configuration
): boolean => {
  // If no actions are configured, all tools are allowed
  if (!configuration.actions) {
    return true;
  }

  const permissions = toolPermissionMap[toolName];

  // Unknown tools are allowed by default (MCP server may have new tools)
  if (!permissions) {
    return true;
  }

  return permissions.every(({resource, permission}) => {
    // @ts-ignore - dynamic access to actions
    return configuration.actions?.[resource]?.[permission] === true;
  });
};
