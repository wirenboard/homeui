// @vitest-environment happy-dom
import { fireEvent, render, waitFor } from '@testing-library/react';
import { loadJsonSchema, ObjectStore, StoreBuilder, Translator } from '@/stores/json-schema-editor';
import { JsonSchemaEditor } from './json-schema-editor';

const buildStore = (color: string) =>
  new ObjectStore(
    loadJsonSchema({
      type: 'object',
      required: ['color'],
      properties: {
        color: { type: 'string', title: 'Color', format: 'dali-rgb' },
      },
    }),
    { color },
    false,
    new StoreBuilder(),
  );

describe('dali-rgb editor', () => {
  // The editor arrives through React.lazy, and on a loaded builder that import
  // alone outlasts the 1s waitFor window. Warm the module cache, so the
  // Suspense promise resolves from it.
  beforeAll(async () => {
    await import('./dali-rgb-param-editor');
  });

  test('a colour picked with a 255 channel (pure red) is capped at 254, so it never turns into MASK', async () => {
    const store = buildStore('0;0;0');
    const { container } = render(<JsonSchemaEditor store={store} translator={new Translator()} />);

    const picker = await waitFor(() => {
      const el = container.querySelector('input[type="color"]');
      expect(el).not.toBeNull();
      return el as HTMLInputElement;
    }, { timeout: 4000 });
    fireEvent.change(picker, { target: { value: '#ff0000' } });

    expect(store.getParamByKey('color').store.value).toBe('254;0;0');
  });
});
