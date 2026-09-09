# JSON Schema editor

`json-schema-editor` is homeui's own schema-driven form editor: a React + MobX component
(`@/components/json-schema-editor`) backed by a tree of typed stores
(`@/stores/json-schema-editor`). It renders a form from a JSON Schema, validates it
reactively, and hands you back the edited value.

It is the successor to the legacy forked `@wirenboard/json-editor`
(`@/components/json-editor`). The two coexist today — this one powers the DALI settings and
the device-manager config editor, the fork still powers the generic confed configurator and
network connections.

A confed config can opt into this editor: set `configFile.editor` to `"wb-json-editor"`
in its schema. Confed surfaces that as the `editor` field, and the configurator page
(`pages/settings/configs`) renders the config with this editor.

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
| --- | --- |
| `value` | current edited value (property omitted from an object's `value` when `undefined`) |
| `isDirty` | changed since the last `commit()` |
| `hasErrors` | fails schema validation |
| `error` | the current `ValidationError`, if any |
| `commit()` / `reset()` | accept / roll back changes |
| `setValue()` / `setDefault()` / `setUndefined()` | set programmatically |

## Supported schema

The schema subset the editor currently renders. Verified against `store-builder.ts`,
`json-schema-loader.ts` and `json-schema-editor.tsx`.

### Value types

- `string` — text input, or a dropdown when `enum` is present (`options.enum_titles` and
  translations supply the labels). Supports `minLength`, `maxLength`, `pattern` plus
  `options.patternmessage`.
- `number` / `integer` — supports `minimum`, `maximum`, `enum`, `default`.
- `boolean` — checkbox.

### Objects

- `properties`, `required`, arbitrary nesting.
- `options.grid_columns` — how many grid columns the field spans
- `options.hidden` — the property is not rendered.
- `options.show_opt_in` / `options.wb.show_editor` — show an optional property with its editor
  up front instead of behind an opt-in toggle. `show_editor` keeps the editor permanent.
- `options.wb.read_only` — the control is disabled, and for arrays it also hides the add /
  remove buttons.
- `options.wb.omit_default` — drop the property from the saved value when it equals the schema
  default.
- `options.wb.new_row` — force the field onto a new row in the grid layout.

### Arrays

- Plain arrays, plus `minItems` / `maxItems`.
- Boolean-item arrays render as a checkbox list.
- Object-item arrays with `format: "table"` render as a table.

### Reuse and composition

- `$ref` to `#/definitions/...`.
- `allOf` merged into one object.
- `translations` for localized labels (via `Translator`).

### Special formats (handled by the default builder)

- DALI colour and level editors:
  - `dali-rgb` — an RGB(W) colour picker with per-channel sliders.
  - `dali-level` — a brightness / level slider (with a mask switch).
  - `dali-white` — a tunable-white slider.
  - `dali-tc` — a colour-temperature slider. The user edits Kelvin, the value is stored as
    mirek.
- `wb-byte-array` — an editor for a byte-array value (`ByteArrayStore`).
- `wb-serial-int`, `wb-int-address` — an integer / address kept as a string to simplify input.
  The builder converts a numeric value to a string and uses the `oneOf[0]` subschema.
- `wb-serial-number` — a number kept as a string, likewise.

## Not supported yet

- `oneOf` as a variant selector (the fork's `wb-multiple`). `StoreBuilder` returns
  `undefined` for it, so the field is not rendered.
- `dependencies` / conditional visibility. The loader's `sanitizeOptions` drops the key.
- `if` / `then` / `else`.
- `wb-autocomplete` and `wb-dynamic-type`. No built-in editors — the field degrades to plain
  text or number.
- Tabs / categories layout.
