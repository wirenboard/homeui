import { loadJsonSchema } from '@/stores/json-schema-editor';

const DEPENDENCIES = { mode: ['tcp', 'udp'], secure: true };

describe('loadJsonSchema keeps options.dependencies', () => {
  test('on a plain property', () => {
    const schema = loadJsonSchema({
      type: 'object',
      properties: { port: { type: 'integer', options: { dependencies: DEPENDENCIES } } },
    });
    expect(schema.properties.port.options.dependencies).toEqual(DEPENDENCIES);
  });

  test('set next to a $ref and inside the referenced definition', () => {
    const schema = loadJsonSchema({
      type: 'object',
      definitions: {
        port: { type: 'integer', options: { dependencies: { mode: 'tcp' } } },
      },
      properties: {
        outer: { $ref: '#/definitions/port', options: { dependencies: DEPENDENCIES } },
        inner: { $ref: '#/definitions/port' },
      },
    });
    expect(schema.properties.outer.options.dependencies).toEqual(DEPENDENCIES);
    expect(schema.properties.inner.options.dependencies).toEqual({ mode: 'tcp' });
  });

  test('on an allOf object and on properties merged from its parts', () => {
    const schema = loadJsonSchema({
      type: 'object',
      properties: {
        conn: {
          allOf: [
            { type: 'object', properties: { port: { type: 'integer', options: { dependencies: { mode: 'tcp' } } } } },
          ],
          options: { dependencies: DEPENDENCIES },
        },
      },
    });
    expect(schema.properties.conn.options.dependencies).toEqual(DEPENDENCIES);
    expect(schema.properties.conn.properties.port.options.dependencies).toEqual({ mode: 'tcp' });
  });

  test('without keys whose value is an object or null', () => {
    const schema = loadJsonSchema({
      type: 'object',
      properties: {
        port: { type: 'integer', options: { dependencies: { ...DEPENDENCIES, cfg: { a: 1 }, other: null } } },
      },
    });
    expect(schema.properties.port.options.dependencies).toEqual(DEPENDENCIES);
  });

  test('on a oneOf property', () => {
    const schema = loadJsonSchema({
      type: 'object',
      properties: {
        port: { oneOf: [{ type: 'integer' }, { type: 'string' }], options: { dependencies: DEPENDENCIES } },
      },
    });
    expect(schema.properties.port.options.dependencies).toEqual(DEPENDENCIES);
  });
});
