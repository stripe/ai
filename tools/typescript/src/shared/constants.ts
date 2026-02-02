/**
 * Shared constants for the Stripe Agent Toolkit.
 * VERSION is injected at build time from package.json via tsup.config.ts
 */

declare const process: {env: {PACKAGE_VERSION?: string}};

export const VERSION = process.env.PACKAGE_VERSION || '0.0.0-development';
export const MCP_SERVER_URL = 'https://mcp.stripe.com';
export const TOOLKIT_HEADER = 'stripe-agent-toolkit-typescript';
export const MCP_HEADER = 'stripe-mcp-local';
