import type { JsonSchema } from '@/stores/json-schema-editor';
import { relativizeTcLimitPaths } from './tc-limit-paths';

const tcField = (min?: string, max?: string): JsonSchema => ({
  type: 'number',
  format: 'dali-tc',
  options: { wb: { dali_tc: { ...(min && { min_limit: min }), ...(max && { max_limit: max }) } } },
});

// Mirrors the real GetGroup/GetBus schema: flat top-level sections, each mounted
// as its own editor root, with dali_tc limit paths stored absolute from the root.
const makeSchema = (): JsonSchema => ({
  type: 'object',
  properties: {
    power_on_colour_32: {
      type: 'object',
      properties: { tc: tcField('tc_limits.tc_coolest', 'tc_limits.tc_warmest') },
    },
    scene_32: {
      type: 'object',
      properties: { tc: tcField('tc_limits.tc_coolest', 'tc_limits.tc_warmest') },
    },
    tc_limits: {
      type: 'object',
      properties: {
        tc_warmest: tcField('tc_limits.tc_coolest', 'tc_limits.tc_physical_warmest'),
        tc_coolest: tcField('tc_limits.tc_physical_coolest', 'tc_limits.tc_warmest'),
      },
    },
  },
});

const daliTc = (schema: JsonSchema, section: string, field: string) =>
  schema.properties[section].properties[field].options?.wb?.dali_tc;

describe('relativizeTcLimitPaths', () => {
  it('strips the section prefix from in-section (tc_limits interlock) paths', () => {
    const schema = makeSchema();
    relativizeTcLimitPaths(schema);
    expect(daliTc(schema, 'tc_limits', 'tc_warmest')).toEqual({
      min_limit: 'tc_coolest',
      max_limit: 'tc_physical_warmest',
    });
    expect(daliTc(schema, 'tc_limits', 'tc_coolest')).toEqual({
      min_limit: 'tc_physical_coolest',
      max_limit: 'tc_warmest',
    });
  });

  it('leaves cross-section paths (a colour section pointing at the sibling tc_limits section) untouched', () => {
    const schema = makeSchema();
    relativizeTcLimitPaths(schema);
    expect(daliTc(schema, 'power_on_colour_32', 'tc')).toEqual({
      min_limit: 'tc_limits.tc_coolest',
      max_limit: 'tc_limits.tc_warmest',
    });
    expect(daliTc(schema, 'scene_32', 'tc')).toEqual({
      min_limit: 'tc_limits.tc_coolest',
      max_limit: 'tc_limits.tc_warmest',
    });
  });

  it('recurses into array items so tc fields nested under array sections are rewritten', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        tc_limits: {
          type: 'array',
          items: { type: 'object', properties: { tc_warmest: tcField('tc_limits.tc_coolest') } },
        },
      },
    };
    relativizeTcLimitPaths(schema);
    const items = schema.properties.tc_limits.items as JsonSchema;
    expect(items.properties.tc_warmest.options?.wb?.dali_tc?.min_limit).toBe('tc_coolest');
  });

  it('is a no-op for a schema without properties', () => {
    expect(() => relativizeTcLimitPaths(undefined)).not.toThrow();
    expect(() => relativizeTcLimitPaths({ type: 'object' })).not.toThrow();
  });
});
