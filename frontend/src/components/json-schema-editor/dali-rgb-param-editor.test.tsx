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
  test('a colour picked with a 255 channel (pure red) is capped at 254, so it never turns into MASK', async () => {
    const store = buildStore('0;0;0');
    const { container } = render(<JsonSchemaEditor store={store} translator={new Translator()} />);

    const picker = await waitFor(() => {
      const el = container.querySelector('input[type="color"]');
      expect(el).not.toBeNull();
      return el as HTMLInputElement;
    });
    fireEvent.change(picker, { target: { value: '#ff0000' } });

    expect(store.getParamByKey('color').store.value).toBe('254;0;0');
  });
});
