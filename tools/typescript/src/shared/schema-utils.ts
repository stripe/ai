import {z} from 'zod';
import type {McpTool} from './mcp-client';

/**
 * Convert a JSON Schema to a Zod schema shape (ZodRawShape).
 * This is used to convert MCP tool schemas to Zod for local validation.
 *
 * Note: This is a simplified conversion that handles common cases.
 * Complex schemas (oneOf, anyOf, $ref, etc.) are not fully supported.
 */
export function jsonSchemaToZodShape(
  schema: McpTool['inputSchema']
): Record<string, z.ZodTypeAny> {
  if (!schema || schema.type !== 'object') {
    return {};
  }

  const properties = schema.properties || {};
  const required = new Set(schema.required || []);

  const shape: Record<string, z.ZodTypeAny> = {};

  for (const [key, propSchema] of Object.entries(properties)) {
    const prop = propSchema as {
      type?: string;
      description?: string;
      enum?: string[];
      items?: {type?: string};
    };

    let zodType: z.ZodTypeAny;

    switch (prop.type) {
      case 'string':
        if (prop.enum) {
          zodType = z.enum(prop.enum as [string, ...string[]]);
        } else {
          zodType = z.string();
        }
        break;
      case 'number':
      case 'integer':
        zodType = z.number();
        break;
      case 'boolean':
        zodType = z.boolean();
        break;
      case 'array': {
        const itemType = (prop.items as {type?: string})?.type;
        if (itemType === 'string') {
          zodType = z.array(z.string());
        } else if (itemType === 'number' || itemType === 'integer') {
          zodType = z.array(z.number());
        } else {
          zodType = z.array(z.unknown());
        }
        break;
      }
      case 'object':
        zodType = z.record(z.unknown());
        break;
      default:
        zodType = z.unknown();
    }

    if (prop.description) {
      zodType = zodType.describe(prop.description);
    }

    if (!required.has(key)) {
      zodType = zodType.optional();
    }

    shape[key] = zodType;
  }

  return shape;
}

/**
 * Convert a JSON Schema to a full Zod object schema.
 * This wraps jsonSchemaToZodShape and returns a ZodObject with passthrough.
 */
export function jsonSchemaToZod(
  schema: McpTool['inputSchema']
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape = jsonSchemaToZodShape(schema);
  return z.object(shape).passthrough();
}
