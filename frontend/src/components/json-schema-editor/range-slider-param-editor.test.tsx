// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react';
import { loadJsonSchema, ObjectStore, StoreBuilder, Translator } from '@/stores/json-schema-editor';
import { JsonSchemaEditor } from './json-schema-editor';

const buildStore = (level: number, levelSchema: object = {}) =>
  new ObjectStore(
    loadJsonSchema({
      type: 'object',
      required: ['level'],
      properties: {
        level: {
          type: 'integer', title: 'Level', minimum: 1, maximum: 100, format: 'range', ...levelSchema,
        },
      },
    }),
    { level },
    false,
    new StoreBuilder(),
  );

const renderStore = (store: ObjectStore) =>
  render(<JsonSchemaEditor store={store} translator={new Translator()} />);

// The editor arrives through React.lazy, and on a loaded builder that import
// alone outlasts the 1s findBy* window.
const findSlider = async () =>
  (await screen.findByRole('slider', {}, { timeout: 4000 })) as HTMLInputElement;

describe('number field with range format', () => {
  // Warm the module cache, so the Suspense promise resolves from it and the
  // import cost is paid in the hook instead of inside a test.
  beforeAll(async () => {
    await import('./range-slider-param-editor');
  });

  test('renders a slider bound to the schema bounds, not a text input', async () => {
    const store = buildStore(40);
    renderStore(store);

    const slider = await findSlider();
    expect(slider.value).toBe('40');
    expect(slider.min).toBe('1');
    expect(slider.max).toBe('100');
    // the range format replaces the plain numeric input entirely
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('spinbutton')).toBeNull();
  });

  test('moving the slider writes the new value to the store', async () => {
    const store = buildStore(40);
    renderStore(store);

    const slider = await findSlider();
    // Range tracks the drag through onInput and commits on mouseUp, so a handler
    // wired to the wrong event would leave the parameter silently unsaved.
    fireEvent.input(slider, { target: { value: '70' } });
    fireEvent.mouseUp(slider);

    expect(store.getParamByKey('level')!.store.value).toBe(70);
    expect(store.value).toEqual({ level: 70 });
  });

  test('a read_only param renders a disabled slider', async () => {
    const store = buildStore(40, { options: { wb: { read_only: true } } });
    renderStore(store);

    const slider = await findSlider();
    expect(slider.disabled).toBe(true);
  });

  test('falls back to 0..100 when the schema states no bounds', async () => {
    const store = buildStore(40, { minimum: undefined, maximum: undefined });
    renderStore(store);

    const slider = await findSlider();
    expect(slider.min).toBe('0');
    expect(slider.max).toBe('100');
  });
});
