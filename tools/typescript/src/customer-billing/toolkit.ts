import {McpServer, ToolCallback} from '@modelcontextprotocol/sdk/server/mcp.js';
import {RequestHandlerExtra} from '@modelcontextprotocol/sdk/shared/protocol.js';
import {
  ServerNotification,
  ServerRequest,
} from '@modelcontextprotocol/sdk/types.js';
import type Stripe from 'stripe';
import {z, ZodRawShape} from 'zod';

const MAX_ARRAY_LENGTH = 20;
const MAX_STRING_LENGTH = 2000;
const MIN_CREDENTIAL_LIFETIME_MS = 5000;
const REDACTED = '[redacted]';

const SENSITIVE_KEYS = new Set([
  'address',
  'billing_details',
  'client_secret',
  'clientSecret',
  'customer',
  'customer_id',
  'customerId',
  'email',
  'name',
  'phone',
  'shipping',
  'tax_ids',
]);

export type CustomerBillingRequestContext = RequestHandlerExtra<
  ServerRequest,
  ServerNotification
>;

export interface ResolvedCustomer {
  customer: string;
  account?: string;
  onBehalfOf?: string;
  configuration?: string;
}

export interface PortalSessionCredential {
  clientSecret: string;
  expiresAt: number | Date;
  sessionId?: string;
}

export interface PortalSessionOptions extends ResolvedCustomer {
  stripe: Stripe;
}

export interface PortalRequestOptions extends PortalSessionOptions {
  credential: PortalSessionCredential;
}

export interface SubscriptionChange {
  subscriptionId: string;
  priceId?: string;
  quantity?: number;
}

export interface CancellationChange {
  subscriptionId: string;
  cancelAtPeriodEnd: boolean;
}

export interface BillingDetailsChange {
  name?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
}

export interface CustomerBillingPortalClient {
  getBillingOverview(options: PortalRequestOptions): Promise<unknown>;
  listInvoices(
    options: PortalRequestOptions & {limit: number; status?: string}
  ): Promise<unknown>;
  previewSubscriptionChange(
    options: PortalRequestOptions & {
      change: SubscriptionChange | CancellationChange;
    }
  ): Promise<unknown>;
  updateSubscription(
    options: PortalRequestOptions & {change: SubscriptionChange}
  ): Promise<unknown>;
  cancelSubscription(
    options: PortalRequestOptions & {change: CancellationChange}
  ): Promise<unknown>;
  updateBillingDetails(
    options: PortalRequestOptions & {change: BillingDetailsChange}
  ): Promise<unknown>;
  openPaymentMethodUpdate(
    options: PortalRequestOptions & {returnUrl?: string}
  ): Promise<unknown>;
}

export type CustomerBillingAction =
  | 'update_subscription'
  | 'cancel_subscription'
  | 'update_billing_details';

export interface CustomerBillingAuthorizationRequest {
  action: CustomerBillingAction;
  input: SubscriptionChange | CancellationChange | BillingDetailsChange;
  preview: unknown;
  context: CustomerBillingRequestContext;
}

export interface RegisterCustomerBillingToolsOptions {
  stripe: Stripe;
  resolveCustomer(
    context: CustomerBillingRequestContext
  ): Promise<ResolvedCustomer> | ResolvedCustomer;
  createPortalSession?(
    options: PortalSessionOptions
  ): Promise<PortalSessionCredential>;
  getPortalSessionCredential?(
    context: CustomerBillingRequestContext,
    customer: ResolvedCustomer
  ): Promise<PortalSessionCredential> | PortalSessionCredential;
  portalClient: CustomerBillingPortalClient;
  authorizeAction?(
    request: CustomerBillingAuthorizationRequest
  ): Promise<boolean | void> | boolean | void;
  configuration?: string;
  account?: string;
  onBehalfOf?: string;
  paymentMethodReturnUrl?: string;
  now?: () => number;
}

const subscriptionChangeSchema = {
  subscription_id: z.string().min(1).describe('Subscription to change'),
  price_id: z.string().min(1).optional().describe('New price'),
  quantity: z.number().int().positive().optional().describe('New quantity'),
};

const cancellationSchema = {
  subscription_id: z.string().min(1).describe('Subscription to cancel'),
  cancel_at_period_end: z
    .boolean()
    .default(true)
    .describe('Cancel at the end of the current billing period'),
};

const billingDetailsSchema = {
  name: z.string().min(1).max(200).optional(),
  address: z
    .object({
      line1: z.string().max(200).optional(),
      line2: z.string().max(200).optional(),
      city: z.string().max(100).optional(),
      state: z.string().max(100).optional(),
      postal_code: z.string().max(20).optional(),
      country: z.string().length(2).optional(),
    })
    .optional(),
};

function toExpirationTime(value: number | Date): number {
  if (value instanceof Date) {
    return value.getTime();
  }
  return value < 100000000000 ? value * 1000 : value;
}

function normalizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.slice(0, MAX_STRING_LENGTH);
  }
  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_LENGTH).map(normalizeValue);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !SENSITIVE_KEYS.has(key))
        .map(([key, child]) => [key, normalizeValue(child)])
    );
  }
  return value;
}

function result(value: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(normalizeValue(value)),
      },
    ],
  };
}

function sanitizeError(
  error: unknown,
  credential?: PortalSessionCredential
): Error {
  let message = error instanceof Error ? error.message : String(error);
  if (credential?.clientSecret) {
    message = message.split(credential.clientSecret).join(REDACTED);
  }
  return new Error(message.slice(0, MAX_STRING_LENGTH));
}

function mergeCustomerContext(
  resolved: ResolvedCustomer,
  options: RegisterCustomerBillingToolsOptions
): ResolvedCustomer {
  return {
    customer: resolved.customer,
    account: resolved.account ?? options.account,
    onBehalfOf: resolved.onBehalfOf ?? options.onBehalfOf,
    configuration: resolved.configuration ?? options.configuration,
  };
}

function validateResolvedCustomer(resolved: ResolvedCustomer): void {
  if (
    !resolved ||
    typeof resolved.customer !== 'string' ||
    !resolved.customer
  ) {
    throw new Error('Unable to resolve a customer for this request.');
  }
}

async function withPortalSession<T>(
  context: CustomerBillingRequestContext,
  options: RegisterCustomerBillingToolsOptions,
  callback: (request: PortalRequestOptions) => Promise<T>
): Promise<T> {
  const resolved = mergeCustomerContext(
    await options.resolveCustomer(context),
    options
  );
  validateResolvedCustomer(resolved);

  const sessionOptions = {...resolved, stripe: options.stripe};
  let credential: PortalSessionCredential | undefined;
  try {
    credential = options.getPortalSessionCredential
      ? await options.getPortalSessionCredential(context, resolved)
      : await options.createPortalSession!(sessionOptions);
    if (!credential.clientSecret) {
      throw new Error('The billing session did not include a credential.');
    }
    const now = options.now?.() ?? Date.now();
    if (
      toExpirationTime(credential.expiresAt) <
      now + MIN_CREDENTIAL_LIFETIME_MS
    ) {
      throw new Error('The billing session expired before it could be used.');
    }
    return await callback({...sessionOptions, credential});
  } catch (error) {
    throw sanitizeError(error, credential);
  }
}

async function authorize(
  options: RegisterCustomerBillingToolsOptions,
  request: CustomerBillingAuthorizationRequest
): Promise<void> {
  const authorized = await options.authorizeAction?.(request);
  if (authorized === false) {
    throw new Error('This billing action was not authorized.');
  }
}

function subscriptionChange(input: {
  subscription_id: string;
  price_id?: string;
  quantity?: number;
}): SubscriptionChange {
  return {
    subscriptionId: input.subscription_id,
    priceId: input.price_id,
    quantity: input.quantity,
  };
}

function cancellationChange(input: {
  subscription_id: string;
  cancel_at_period_end: boolean;
}): CancellationChange {
  return {
    subscriptionId: input.subscription_id,
    cancelAtPeriodEnd: input.cancel_at_period_end,
  };
}

function billingDetailsChange(input: {
  name?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
}): BillingDetailsChange {
  return {
    name: input.name,
    address: input.address
      ? {
          line1: input.address.line1,
          line2: input.address.line2,
          city: input.address.city,
          state: input.address.state,
          postalCode: input.address.postal_code,
          country: input.address.country,
        }
      : undefined,
  };
}

function registerReadTool<T extends ZodRawShape>(
  server: McpServer,
  name: string,
  description: string,
  inputSchema: T,
  handler: (
    input: z.objectOutputType<T, z.ZodTypeAny>,
    context: CustomerBillingRequestContext
  ) => Promise<unknown>
): void {
  const callback = (async (
    input: z.objectOutputType<T, z.ZodTypeAny>,
    context: CustomerBillingRequestContext
  ) => result(await handler(input, context))) as ToolCallback<T>;
  server.registerTool(
    name,
    {
      description,
      inputSchema,
      annotations: {readOnlyHint: true, openWorldHint: false},
    },
    callback
  );
}

function registerWriteTool<T extends ZodRawShape>(
  server: McpServer,
  name: CustomerBillingAction,
  description: string,
  inputSchema: T,
  destructiveHint: boolean,
  handler: (
    input: z.objectOutputType<T, z.ZodTypeAny>,
    context: CustomerBillingRequestContext
  ) => Promise<unknown>
): void {
  const callback = (async (
    input: z.objectOutputType<T, z.ZodTypeAny>,
    context: CustomerBillingRequestContext
  ) => result(await handler(input, context))) as ToolCallback<T>;
  server.registerTool(
    name,
    {
      description,
      inputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    callback
  );
}

export function registerCustomerBillingTools(
  server: McpServer,
  options: RegisterCustomerBillingToolsOptions
): void {
  if (
    Boolean(options.createPortalSession) ===
    Boolean(options.getPortalSessionCredential)
  ) {
    throw new Error('Provide exactly one billing session credential provider.');
  }

  registerReadTool(
    server,
    'get_billing_overview',
    'Get the authenticated customer billing overview and subscriptions',
    {},
    (_input, context) =>
      withPortalSession(context, options, (request) =>
        options.portalClient.getBillingOverview(request)
      )
  );

  registerReadTool(
    server,
    'list_invoices',
    'List recent invoices for the authenticated customer',
    {
      status: z
        .enum(['draft', 'open', 'paid', 'uncollectible', 'void'])
        .optional(),
      limit: z.number().int().min(1).max(MAX_ARRAY_LENGTH).default(10),
    },
    (input, context) =>
      withPortalSession(context, options, (request) =>
        options.portalClient.listInvoices({...request, ...input})
      )
  );

  registerReadTool(
    server,
    'preview_subscription_change',
    'Preview a subscription update before requesting approval',
    subscriptionChangeSchema,
    (input, context) =>
      withPortalSession(context, options, (request) =>
        options.portalClient.previewSubscriptionChange({
          ...request,
          change: subscriptionChange(input),
        })
      )
  );

  registerReadTool(
    server,
    'open_payment_method_update',
    'Create a hosted billing portal link for updating payment methods',
    {},
    (_input, context) =>
      withPortalSession(context, options, (request) =>
        options.portalClient.openPaymentMethodUpdate({
          ...request,
          returnUrl: options.paymentMethodReturnUrl,
        })
      )
  );

  if (!options.authorizeAction) {
    return;
  }

  registerWriteTool(
    server,
    'update_subscription',
    'Update a subscription after previewing and approving the change',
    subscriptionChangeSchema,
    false,
    (input, context) =>
      withPortalSession(context, options, async (request) => {
        const change = subscriptionChange(input);
        const preview = await options.portalClient.previewSubscriptionChange({
          ...request,
          change,
        });
        await authorize(options, {
          action: 'update_subscription',
          input: change,
          preview: normalizeValue(preview),
          context,
        });
        return options.portalClient.updateSubscription({...request, change});
      })
  );

  registerWriteTool(
    server,
    'cancel_subscription',
    'Cancel a subscription after previewing and approving the cancellation',
    cancellationSchema,
    true,
    (input, context) =>
      withPortalSession(context, options, async (request) => {
        const change = cancellationChange(input);
        const preview = await options.portalClient.previewSubscriptionChange({
          ...request,
          change,
        });
        await authorize(options, {
          action: 'cancel_subscription',
          input: change,
          preview: normalizeValue(preview),
          context,
        });
        return options.portalClient.cancelSubscription({...request, change});
      })
  );

  registerWriteTool(
    server,
    'update_billing_details',
    'Update the authenticated customer billing name or address after approval',
    billingDetailsSchema,
    false,
    (input, context) =>
      withPortalSession(context, options, async (request) => {
        const change = billingDetailsChange(input);
        await authorize(options, {
          action: 'update_billing_details',
          input: change,
          preview: normalizeValue(change),
          context,
        });
        return options.portalClient.updateBillingDetails({...request, change});
      })
  );
}
