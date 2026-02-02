import {z, ZodRawShape} from 'zod';
import {ToolCallback} from '@modelcontextprotocol/sdk/server/mcp.js';
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {registerPaidTool} from '../modelcontextprotocol/register-paid-tool';
import type {PaidToolOptions} from '../modelcontextprotocol/register-paid-tool';

// @ts-ignore: The current file is a CommonJS module whose imports will produce 'require' calls; however, the referenced file is an ECMAScript module and cannot be imported with 'require'.
import {McpAgent} from 'agents/mcp';

type Env = any;

type StripeState = {
  customerId: string;
};

export type PaymentState = {
  stripe?: StripeState;
};

export type PaymentProps = {
  userEmail: string;
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export abstract class experimental_PaidMcpAgent<
  Bindings extends Env,
  State extends PaymentState,
  Props extends PaymentProps,
> extends McpAgent<Bindings, State, Props> {
  paidTool<Args extends ZodRawShape>(
    toolName: string,
    toolDescription: string,
    paramsSchema: Args,
    // @ts-ignore
    paidCallback: ToolCallback<Args>,
    options: Omit<PaidToolOptions, 'userEmail' | 'stripeSecretKey'>
  ) {
    const mcpServer: McpServer = this.server as unknown as McpServer;

    const userEmail = this.props.userEmail;

    const updatedOptions = {
      ...options,
      userEmail,
      // @ts-ignore
      stripeSecretKey: this.env.STRIPE_SECRET_KEY,
    };

    // @ts-ignore
    registerPaidTool(
      mcpServer,
      toolName,
      toolDescription,
      paramsSchema,
      paidCallback,
      updatedOptions
    );
  }
}
