// @vitest-environment happy-dom
import { act, render, screen } from '@testing-library/react';
import { loadJsonSchema, ObjectStore, StoreBuilder, Translator } from '@/stores/json-schema-editor';
import { JsonSchemaEditor } from './json-schema-editor';

vi.mock('@/components/dropdown', () => import('@/test/mocks/dropdown'));

const buildStore = (mode: string) =>
  new ObjectStore(
    loadJsonSchema({
      type: 'object',
      required: ['mode', 'port'],
      properties: {
        mode: { type: 'string', title: 'Mode', enum: ['tcp', 'serial'], propertyOrder: 1 },
        port: { type: 'integer', title: 'Port', propertyOrder: 2, options: { dependencies: { mode: 'tcp' } } },
      },
    }),
    { mode, port: 502 },
    false,
    new StoreBuilder(),
  );

describe('ObjectEditor with options.dependencies', () => {
  test('a param with unmet dependencies is not rendered and appears once the sibling matches', async () => {
    const store = buildStore('serial');
    render(<JsonSchemaEditor store={store} translator={new Translator()} />);

    await screen.findByText('Mode');
    expect(screen.queryByText('Port')).toBeNull();

    act(() => store.getParamByKey('mode')!.store.setValue('tcp'));
    expect(await screen.findByText('Port')).toBeTruthy();

    act(() => store.getParamByKey('mode')!.store.setValue('serial'));
    expect(screen.queryByText('Port')).toBeNull();
  });
});
