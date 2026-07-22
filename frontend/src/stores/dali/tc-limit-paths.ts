import type { JsonSchema } from '@/stores/json-schema-editor';

// The DALI group and bus (broadcast) editors mount each top-level schema section
// as its own JsonSchemaEditor, so every section is the root store its dali_tc
// sliders resolve limit paths against. The schema, however, stores those paths
// absolute from the whole-object root (e.g. 'tc_limits.tc_coolest'). Rewrite each
// path that points inside its own section to be relative to that section's root,
// so the in-section interlocks (the tc_limits warmest/coolest bounds) resolve.
//
// Cross-section references — a colour section's `tc` pointing at the sibling
// `tc_limits` section — are intentionally left untouched: the target lives in a
// different mount, is unreachable by any relative path, and the slider falls back
// to its default bounds.
//
// Not needed for the device editor: it mounts the whole object as a single tree,
// where the absolute paths already resolve.

const relativizeLimitPath = (path: string | undefined, prefix: string): string | undefined =>
  typeof path === 'string' && path.startsWith(prefix) ? path.slice(prefix.length) : path;

const relativizeNode = (node: JsonSchema, prefix: string): void => {
  const tc = node.options?.wb?.dali_tc;
  if (tc) {
    if (tc.min_limit !== undefined) {
      tc.min_limit = relativizeLimitPath(tc.min_limit, prefix);
    }
    if (tc.max_limit !== undefined) {
      tc.max_limit = relativizeLimitPath(tc.max_limit, prefix);
    }
  }
  if (node.properties) {
    Object.values(node.properties).forEach((child) => relativizeNode(child, prefix));
  }
  if (Array.isArray(node.items)) {
    node.items.forEach((item) => relativizeNode(item, prefix));
  } else if (node.items) {
    relativizeNode(node.items, prefix);
  }
};

export const relativizeTcLimitPaths = (schema: JsonSchema | undefined): void => {
  if (!schema?.properties) {
    return;
  }
  Object.entries(schema.properties).forEach(([key, section]) => {
    relativizeNode(section, `${key}.`);
  });
};
