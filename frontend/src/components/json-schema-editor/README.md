# JSON Schema editor

`json-schema-editor` is homeui's own schema-driven form editor: a React + MobX component
(`@/components/json-schema-editor`) backed by a tree of typed stores
(`@/stores/json-schema-editor`). It renders a form from a JSON Schema, validates it
reactively, and hands you back the edited value.

It is the successor to the legacy forked `@wirenboard/json-editor`
(`@/components/json-editor`). The two coexist today — this one powers the DALI settings and
the device-manager config editor, the fork still powers the generic confed configurator and
network connections.

## How it works

The data flow is **raw schema + data → stores → component**:

1. `loadJsonSchema(raw)` parses the schema (expands `$ref`, merges `allOf`, extracts
   `translations`).
2. `new ObjectStore(schema, data, required, new StoreBuilder())` builds a tree of stores,
   one per property. `StoreBuilder` picks the store type from `schema.type` / `schema.format`.
3. `<JsonSchemaEditor store translator />` renders the form from that store tree and
   validates it live. Every store exposes observable `value` / `isDirty` / `hasErrors` /
   `error`.

The component never fetches anything. The page owns the transport (usually MQTT-RPC), builds
the store, and decides how to save.

## Wiring it into a page

Building the store (see `@/stores/dali/bus-store.ts` for a real example):

```ts
import { ObjectStore, StoreBuilder, Translator, loadJsonSchema } from '@/stores/json-schema-editor';

// raw schema + data come from any transport — here an MQTT-RPC proxy
const data = await someProxy.Load({ path });

const schema = loadJsonSchema(data.schema);
const translator = new Translator();
translator.addTranslations(schema.translations);

const store = new ObjectStore(schema, data.config, false, new StoreBuilder());
```

Rendering it (see `.../dali/components/bus-tab-content/bus-tab-content.tsx`):

```tsx
import { JsonSchemaEditor } from '@/components/json-schema-editor';

<JsonSchemaEditor store={store} translator={translator} />
```

Reading the result and saving:

```ts
// dirty/valid drive the Save button
const canSave = store.isDirty && !store.hasErrors;

if (canSave) {
  await someProxy.Save({ path, content: store.value });
  store.commit(); // mark current value as the new clean baseline
}
// store.reset() rolls back to the last committed value
```

The store API you read (`PropertyStore` in `@/stores/json-schema-editor/types.ts`):

| member | meaning |
|---|---|
| `value` | current edited value (property omitted from an object's `value` when `undefined`) |
| `isDirty` | changed since the last `commit()` |
| `hasErrors` | fails schema validation |
| `error` | the current `ValidationError`, if any |
| `commit()` / `reset()` | accept / roll back changes |
| `setValue()` / `setDefault()` / `setUndefined()` | set programmatically |

## Supported schema

The schema subset the editor currently renders. Verified against `store-builder.ts`,
`json-schema-loader.ts` and `json-schema-editor.tsx`.

**Value types**
- `string` — text input, or a dropdown when `enum` is present (`options.enum_titles` and
  translations supply the labels). Honours `minLength`, `maxLength`, `pattern` plus
  `options.patternmessage`.
- `number` / `integer` — honours `minimum`, `maximum`, `enum`, `default`.
- `boolean` — checkbox.

**Objects**
- `properties`, `required`, arbitrary nesting.
- Column layout via `options.grid_columns`.
- `options.hidden`, opt-in optional properties (`options.show_opt_in` or
  `options.wb.show_editor`), read-only (`options.wb.read_only`), `options.wb.omit_default`,
  `options.wb.disable_title`, `options.wb.new_row`.

**Arrays**
- Plain arrays, plus `minItems` / `maxItems`.
- Boolean-item arrays render as a checkbox list.
- Object-item arrays with `format: "table"` render as a table.

**Reuse and composition**
- `$ref` to `#/definitions/...`.
- `allOf` merged into one object.
- `translations` for localized labels (via `Translator`).

**Special formats** (handled by the default builder)
- DALI — `dali-rgb`, `dali-level`, `dali-white`, DALI colour temperature (custom sliders and
  a colour picker).
- `wb-byte-array`.
- `wb-serial-int`, `wb-serial-number`, `wb-int-address` — kept as strings to simplify input.

## Extending with custom editors

Pass a `customEditorBuilder`. It is tried first for every store; return a React element to
take over, or `null` to fall back to the built-in editor.

```tsx
import type { EditorBuilderFunction } from '@/components/json-schema-editor/types';

const customEditorBuilder: EditorBuilderFunction = (props) => {
  if (props.store.schema.format === 'wb-autocomplete') {
    return <AutocompleteEditor store={props.store} translator={props.translator} />;
  }
  return null; // fall back to the default builder
};

<JsonSchemaEditor store={store} translator={translator} customEditorBuilder={customEditorBuilder} />;
```

Resolve custom editors by `schema.format`. A custom editor reaches sibling fields through
`props.rootStore` (e.g. `ObjectStore.getParamByKey`) and stays reactive through MobX — there
is no `watch` mechanism like the fork.

## Not supported yet

- `oneOf` as a variant selector (the fork's `wb-multiple`). `StoreBuilder` returns
  `undefined` for it, so the field is not rendered.
- `dependencies` / conditional visibility. The loader's `sanitizeOptions` drops the key.
- `if` / `then` / `else`.
- `wb-autocomplete` and `wb-dynamic-type`. No built-in editors — the field degrades to plain
  text or number.
- Tabs / categories layout.

> The loader copies only known `options` keys and silently drops the rest. An unknown option
> will not break the form, but it will not take effect either.

## Key limitation — not schema-dropped

Unlike the legacy confed configurator, you cannot drop a schema file on the controller and
get a form. There is no generic "schema path → form" route, and `configFile.path` is
ignored. Adding a configurator on this editor means writing a page and a store in homeui and
shipping a release. Today's live consumers — DALI settings and the device-manager config
editor — are both hand-written pages with their own stores.
