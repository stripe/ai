import {z} from 'zod';
import {jsonSchemaToZod, jsonSchemaToZodShape} from '@/shared/schema-utils';

describe('jsonSchemaToZodShape', () => {
  it('should return empty object for null schema', () => {
    const shape = jsonSchemaToZodShape(undefined);
    expect(shape).toEqual({});
  });

  it('should return empty object for non-object schema', () => {
    const shape = jsonSchemaToZodShape({type: 'string'} as any);
    expect(shape).toEqual({});
  });

  it('should convert string properties', () => {
    const shape = jsonSchemaToZodShape({
      type: 'object',
      properties: {
        name: {type: 'string'},
      },
    });

    expect(shape.name).toBeDefined();
    const result = shape.name.safeParse('test');
    expect(result.success).toBe(true);
  });

  it('should convert number properties', () => {
    const shape = jsonSchemaToZodShape({
      type: 'object',
      properties: {
        count: {type: 'number'},
      },
    });

    expect(shape.count).toBeDefined();
    const result = shape.count.safeParse(42);
    expect(result.success).toBe(true);
  });

  it('should convert integer properties as number', () => {
    const shape = jsonSchemaToZodShape({
      type: 'object',
      properties: {
        count: {type: 'integer'},
      },
    });

    expect(shape.count).toBeDefined();
    const result = shape.count.safeParse(42);
    expect(result.success).toBe(true);
  });

  it('should convert boolean properties', () => {
    const shape = jsonSchemaToZodShape({
      type: 'object',
      properties: {
        active: {type: 'boolean'},
      },
    });

    expect(shape.active).toBeDefined();
    const result = shape.active.safeParse(true);
    expect(result.success).toBe(true);
  });

  it('should convert enum properties', () => {
    const shape = jsonSchemaToZodShape({
      type: 'object',
      properties: {
        status: {type: 'string', enum: ['active', 'inactive']},
      },
    });

    expect(shape.status).toBeDefined();
    expect(shape.status.safeParse('active').success).toBe(true);
    expect(shape.status.safeParse('invalid').success).toBe(false);
  });

  it('should convert array properties with string items', () => {
    const shape = jsonSchemaToZodShape({
      type: 'object',
      properties: {
        tags: {type: 'array', items: {type: 'string'}},
      },
    });

    expect(shape.tags).toBeDefined();
    const result = shape.tags.safeParse(['tag1', 'tag2']);
    expect(result.success).toBe(true);
  });

  it('should convert array properties with number items', () => {
    const shape = jsonSchemaToZodShape({
      type: 'object',
      properties: {
        values: {type: 'array', items: {type: 'number'}},
      },
    });

    expect(shape.values).toBeDefined();
    const result = shape.values.safeParse([1, 2, 3]);
    expect(result.success).toBe(true);
  });

  it('should handle required fields', () => {
    const shape = jsonSchemaToZodShape({
      type: 'object',
      properties: {
        required_field: {type: 'string'},
        optional_field: {type: 'string'},
      },
      required: ['required_field'],
    });

    // Required field should not be optional
    expect(shape.required_field.isOptional()).toBe(false);
    // Optional field should be optional
    expect(shape.optional_field.isOptional()).toBe(true);
  });

  it('should preserve descriptions', () => {
    const shape = jsonSchemaToZodShape({
      type: 'object',
      properties: {
        email: {type: 'string', description: 'Customer email address'},
      },
    });

    expect(shape.email).toBeDefined();
    expect(shape.email.description).toBe('Customer email address');
  });

  it('should handle object properties as record', () => {
    const shape = jsonSchemaToZodShape({
      type: 'object',
      properties: {
        metadata: {type: 'object'},
      },
    });

    expect(shape.metadata).toBeDefined();
    const result = shape.metadata.safeParse({key: 'value'});
    expect(result.success).toBe(true);
  });

  it('should handle unknown types', () => {
    const shape = jsonSchemaToZodShape({
      type: 'object',
      properties: {
        data: {type: 'unknown_type' as any},
      },
    });

    expect(shape.data).toBeDefined();
    // Unknown type should accept anything
    const result = shape.data.safeParse('anything');
    expect(result.success).toBe(true);
  });
});

describe('jsonSchemaToZod', () => {
  it('should return a passthrough object for empty schema', () => {
    const schema = jsonSchemaToZod(undefined);
    expect(schema).toBeDefined();

    // Should accept any object
    const result = schema.safeParse({extra: 'field'});
    expect(result.success).toBe(true);
  });

  it('should validate required fields', () => {
    const schema = jsonSchemaToZod({
      type: 'object',
      properties: {
        email: {type: 'string'},
        name: {type: 'string'},
      },
      required: ['email'],
    });

    // Missing required field should fail
    const result1 = schema.safeParse({name: 'John'});
    expect(result1.success).toBe(false);

    // With required field should pass
    const result2 = schema.safeParse({email: 'john@example.com'});
    expect(result2.success).toBe(true);

    // With all fields should pass
    const result3 = schema.safeParse({
      email: 'john@example.com',
      name: 'John',
    });
    expect(result3.success).toBe(true);
  });

  it('should allow extra fields with passthrough', () => {
    const schema = jsonSchemaToZod({
      type: 'object',
      properties: {
        known: {type: 'string'},
      },
    });

    const result = schema.safeParse({known: 'value', extra: 'field'});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.extra).toBe('field');
    }
  });

  it('should work with complex nested schemas', () => {
    const schema = jsonSchemaToZod({
      type: 'object',
      properties: {
        customer: {type: 'object'},
        items: {type: 'array', items: {type: 'string'}},
        total: {type: 'number'},
        paid: {type: 'boolean'},
      },
      required: ['total'],
    });

    const result = schema.safeParse({
      customer: {id: 'cus_123'},
      items: ['item1', 'item2'],
      total: 100,
      paid: true,
    });

    expect(result.success).toBe(true);
  });
});
