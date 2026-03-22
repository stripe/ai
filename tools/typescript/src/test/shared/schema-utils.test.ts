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

  it('should convert array with integer items as number', () => {
    const shape = jsonSchemaToZodShape({
      type: 'object',
      properties: {
        ids: {type: 'array', items: {type: 'integer'}},
      },
    });

    expect(shape.ids).toBeDefined();
    expect(shape.ids.safeParse([1, 2, 3]).success).toBe(true);
    expect(shape.ids.safeParse(['a', 'b']).success).toBe(false);
  });

  it('should convert array with no items as unknown', () => {
    const shape = jsonSchemaToZodShape({
      type: 'object',
      properties: {
        data: {type: 'array'},
      },
    });

    expect(shape.data).toBeDefined();
    // Array without items should accept any array elements
    expect(shape.data.safeParse([1, 'mixed', true]).success).toBe(true);
  });

  it('should handle schema with no properties', () => {
    const shape = jsonSchemaToZodShape({
      type: 'object',
    });

    expect(shape).toEqual({});
  });

  it('should handle missing required array', () => {
    const shape = jsonSchemaToZodShape({
      type: 'object',
      properties: {
        a: {type: 'string'},
        b: {type: 'number'},
      },
    });

    // All fields should be optional when required is absent
    expect(shape.a.isOptional()).toBe(true);
    expect(shape.b.isOptional()).toBe(true);
  });

  it('should reject invalid enum values', () => {
    const shape = jsonSchemaToZodShape({
      type: 'object',
      properties: {
        color: {type: 'string', enum: ['red', 'blue', 'green']},
      },
      required: ['color'],
    });

    expect(shape.color.safeParse('red').success).toBe(true);
    expect(shape.color.safeParse('yellow').success).toBe(false);
    expect(shape.color.safeParse(123).success).toBe(false);
  });

  it('should reject wrong types and report expected zod issues', () => {
    const shape = jsonSchemaToZodShape({
      type: 'object',
      properties: {
        count: {type: 'number'},
        name: {type: 'string'},
        active: {type: 'boolean'},
      },
      required: ['count', 'name', 'active'],
    });

    const countResult = shape.count.safeParse('not-a-number');
    expect(countResult.success).toBe(false);
    if (!countResult.success) {
      const issue = countResult.error.issues[0] as z.ZodInvalidTypeIssue;
      expect(issue.code).toBe('invalid_type');
      expect(issue.expected).toBe('number');
      expect(issue.received).toBe('string');
    }

    const nameResult = shape.name.safeParse(42);
    expect(nameResult.success).toBe(false);
    if (!nameResult.success) {
      const issue = nameResult.error.issues[0] as z.ZodInvalidTypeIssue;
      expect(issue.code).toBe('invalid_type');
      expect(issue.expected).toBe('string');
      expect(issue.received).toBe('number');
    }

    expect(shape.active.safeParse('yes').success).toBe(false);
  });

  it('should handle schema with only required key', () => {
    const shape = jsonSchemaToZodShape({
      type: 'object',
      required: ['x'],
    });

    // No properties defined, so shape should be empty
    expect(shape).toEqual({});
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

  it('should reject non-object input', () => {
    const schema = jsonSchemaToZod({
      type: 'object',
      properties: {
        name: {type: 'string'},
      },
    });

    expect(schema.safeParse('not-an-object').success).toBe(false);
    expect(schema.safeParse(42).success).toBe(false);
    expect(schema.safeParse(null).success).toBe(false);
  });

  it('should accept empty object when no fields are required', () => {
    const schema = jsonSchemaToZod({
      type: 'object',
      properties: {
        name: {type: 'string'},
        age: {type: 'number'},
      },
    });

    const result = schema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should reject when any required field is missing', () => {
    const schema = jsonSchemaToZod({
      type: 'object',
      properties: {
        customer: {type: 'string'},
        amount: {type: 'number'},
        currency: {type: 'string'},
      },
      required: ['customer', 'amount', 'currency'],
    });

    // Missing all required
    expect(schema.safeParse({}).success).toBe(false);
    // Missing some required
    expect(schema.safeParse({customer: 'cus_123'}).success).toBe(false);
    // All required present
    expect(
      schema.safeParse({
        customer: 'cus_123',
        amount: 100,
        currency: 'usd',
      }).success
    ).toBe(true);
  });
});
