// @vitest-environment happy-dom
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { loadJsonSchema, ObjectStore, StoreBuilder, Translator } from '@/stores/json-schema-editor';
import { JsonSchemaEditor } from './json-schema-editor';

vi.mock('@/components/dropdown', () => import('@/test/mocks/dropdown'));

// Mirrors the live `on_off_editor_schema`, where `mode` is NOT marked required.
const ON_ACTION_SCHEMA = {
  type: 'object',
  title: 'OnAction',
  properties: {
    mode: {
      type: 'string',
      title: 'OnMode',
      enum: ['scene', 'last_active_level', 'level', 'dapc'],
      options: { enum_titles: ['OnScene', 'OnLast', 'OnLevel', 'OnDapc'] },
      propertyOrder: 1,
    },
    scene: { type: 'integer', title: 'OnSceneField', minimum: 0, maximum: 15, propertyOrder: 2 },
    percent: { type: 'integer', title: 'OnPercentField', minimum: 1, maximum: 100, propertyOrder: 3 },
    value: { type: 'integer', title: 'OnValueField', minimum: 1, maximum: 254, propertyOrder: 4 },
    fade_time: {
      type: 'integer',
      title: 'OnFadeField',
      // -1 is the "from device settings" sentinel; first, so it is the default.
      enum: [-1, 0, 1, 2, 3],
      options: { enum_titles: ['OnFadeDevice', 'OnFade0', 'OnFade1', 'OnFade2', 'OnFade3'] },
      propertyOrder: 5,
    },
  },
};

const OFF_ACTION_SCHEMA = {
  type: 'object',
  title: 'OffAction',
  properties: {
    mode: {
      type: 'string',
      title: 'OffMode',
      enum: ['off', 'dapc'],
      options: { enum_titles: ['OffOff', 'OffDapc'] },
      propertyOrder: 1,
    },
    fade_time: {
      type: 'integer',
      title: 'OffFadeField',
      // -1 is the "from device settings" sentinel; first, so it is the default.
      enum: [-1, 0, 1, 2, 3],
      options: { enum_titles: ['OffFadeDevice', 'OffFade0', 'OffFade1', 'OffFade2', 'OffFade3'] },
      propertyOrder: 2,
    },
  },
};

const BLOCK_SCHEMA = {
  type: 'object',
  format: 'dali-on-off',
  required: ['enabled'],
  properties: {
    enabled: { type: 'boolean', title: 'EnableOnOff', propertyOrder: 1 },
    on_action: { ...ON_ACTION_SCHEMA, propertyOrder: 2 },
    off_action: { ...OFF_ACTION_SCHEMA, propertyOrder: 3 },
  },
};

const FRESH_ENABLED_VALUE = {
  enabled: true,
  on_action: { mode: 'scene', scene: 0 },
  off_action: { mode: 'off' },
};

const buildStore = (config: object = { enabled: false }) =>
  new ObjectStore(loadJsonSchema(BLOCK_SCHEMA), config, false, new StoreBuilder());

const renderEditor = (store: ObjectStore) =>
  render(<JsonSchemaEditor store={store} translator={new Translator()} />);

const enableBlock = async (store: ObjectStore) => {
  const checkbox = await screen.findByRole('checkbox');
  fireEvent.click(checkbox);
  await waitFor(() => expect(store.value).toEqual(FRESH_ENABLED_VALUE));
  return checkbox;
};

const onActionStore = (store: ObjectStore) => store.getParamByKey('on_action')!.store as ObjectStore;

describe('DaliOnOffEditor', () => {
  describe('enabled checkbox gating and visibility', () => {
    test('a disabled block hides both actions, saves as { enabled: false }, and loads clean', async () => {
      const store = buildStore();
      renderEditor(store);

      const checkbox = await screen.findByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
      // actions are hidden while the block is off
      expect(screen.queryByRole('button', { name: 'OnScene' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'OffOff' })).toBeNull();
      // unconfigured block loads clean: exactly { enabled: false }, no errors, not dirty
      expect(store.value).toEqual({ enabled: false });
      expect(store.hasErrors).toBe(false);
      expect(store.isDirty).toBe(false);
    });

    test('disabling the block clears action errors so Save is never blocked', async () => {
      const store = buildStore();
      renderEditor(store);
      const checkbox = await enableBlock(store);

      // an out-of-range field makes the enabled block invalid
      onActionStore(store).getParamByKey('scene')!.store.setValue(20);
      await waitFor(() => expect(store.hasErrors).toBe(true));

      // turning the block off drops the actions from validation entirely
      fireEvent.click(checkbox);
      await waitFor(() => expect(store.value).toEqual({ enabled: false }));
      expect(store.hasErrors).toBe(false);
    });

    test('enabling makes the actions editable with valid populated defaults', async () => {
      const store = buildStore();
      renderEditor(store);
      await enableBlock(store);

      expect(store.hasErrors).toBe(false);
      // the on action's default mode (scene) now shows its field in place
      expect(screen.getByText('OnSceneField')).toBeTruthy();
    });

    test('checking then unchecking returns to the loaded state (not dirty, Save stays off)', async () => {
      const store = buildStore(); // loaded as { enabled: false }, so a clean baseline
      renderEditor(store);
      const checkbox = await enableBlock(store);
      expect(store.isDirty).toBe(true); // enabling is a change

      fireEvent.click(checkbox); // uncheck → back to the loaded { enabled: false }
      await waitFor(() => expect(store.value).toEqual({ enabled: false }));
      // the seeded action content must not linger as a change
      expect(store.isDirty).toBe(false);
    });

    test('hydrates an already-configured block from its loaded value', async () => {
      const store = buildStore({
        enabled: true,
        on_action: { mode: 'level', percent: 40, fade_time: 2 },
        off_action: { mode: 'dapc', fade_time: 1 },
      });
      renderEditor(store);

      const checkbox = await screen.findByRole('checkbox') as HTMLInputElement;
      await waitFor(() => expect(checkbox.checked).toBe(true));
      expect(store.value).toEqual({
        enabled: true,
        on_action: { mode: 'level', percent: 40, fade_time: 2 },
        off_action: { mode: 'dapc', fade_time: 1 },
      });
      expect(store.hasErrors).toBe(false);
    });

    test('unchecking then rechecking keeps a configured block\'s saved actions', async () => {
      // Regression guard: a toggle must not replace the device's settings with defaults.
      const loaded = {
        enabled: true,
        on_action: { mode: 'scene', scene: 5 },
        off_action: { mode: 'dapc', fade_time: 1 },
      };
      const store = buildStore(loaded);
      renderEditor(store);

      const checkbox = await screen.findByRole('checkbox') as HTMLInputElement;
      await waitFor(() => expect(checkbox.checked).toBe(true));

      fireEvent.click(checkbox);
      await waitFor(() => expect(store.value).toEqual({ enabled: false }));

      fireEvent.click(checkbox);
      await waitFor(() => expect(store.value).toEqual(loaded));
      expect(store.hasErrors).toBe(false);
      expect(store.isDirty).toBe(false);
      // the restored values must reach the inputs too, they render from editString
      expect(screen.getByDisplayValue('5')).toBeTruthy();
    });
  });

  describe('mode selector (schema does not mark mode required)', () => {
    test('renders a selectable dropdown (not a disabled placeholder); picking a mode reveals fields', async () => {
      const store = buildStore();
      renderEditor(store);
      const checkbox = await screen.findByRole('checkbox');

      // actions are hidden until the block is enabled
      expect(screen.queryByRole('button', { name: 'OnScene' })).toBeNull();

      fireEvent.click(checkbox);
      await waitFor(() => expect((store.value as any).on_action).toEqual({ mode: 'scene', scene: 0 }));
      // mode is a real dropdown (its options render) even though the schema does not mark mode required
      expect(screen.getByRole('button', { name: 'OnScene' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'OnDapc' })).toBeTruthy();

      fireEvent.click(screen.getByRole('button', { name: 'OnLevel' }));
      await waitFor(() => expect((store.value as any).on_action).toEqual({ mode: 'level', percent: 1, fade_time: -1 }));
      expect(screen.getByText('OnPercentField')).toBeTruthy();
    });
  });

  describe('action mode-driven field visibility and value', () => {
    test('switching the on action to dapc shows value and drops percent from the value', async () => {
      const store = buildStore();
      renderEditor(store);
      await enableBlock(store);

      fireEvent.click(screen.getByRole('button', { name: 'OnDapc' }));

      await waitFor(() => expect((store.value as any).on_action).toEqual({ mode: 'dapc', value: 1, fade_time: -1 }));
      expect(screen.getByText('OnValueField')).toBeTruthy();
      expect(screen.queryByText('OnPercentField')).toBeNull();
    });

    test('the off action dapc mode carries only fade time (no level); toggling resets it to off', async () => {
      const store = buildStore();
      renderEditor(store);
      const checkbox = await enableBlock(store);

      fireEvent.click(screen.getByRole('button', { name: 'OffDapc' }));
      await waitFor(() => expect((store.value as any).off_action).toEqual({ mode: 'dapc', fade_time: -1 }));
      expect(screen.getByText('OffFadeField')).toBeTruthy();

      fireEvent.click(screen.getByRole('button', { name: 'OffFade1' }));
      await waitFor(() => expect((store.value as any).off_action).toEqual({ mode: 'dapc', fade_time: 1 }));

      fireEvent.click(checkbox);
      await waitFor(() => expect(store.value).toEqual({ enabled: false }));
      fireEvent.click(checkbox);
      await waitFor(() => expect((store.value as any).off_action).toEqual({ mode: 'off' }));
    });
  });

  describe('fade time select', () => {
    test('lists the from-device sentinel plus the codes; both are written as the value', async () => {
      const store = buildStore();
      renderEditor(store);
      await enableBlock(store);

      fireEvent.click(screen.getByRole('button', { name: 'OnLast' }));
      // last_active_level seeds fade time to the "from device settings" sentinel (-1)
      await waitFor(() => expect((store.value as any).on_action).toEqual({ mode: 'last_active_level', fade_time: -1 }));

      expect(screen.getByRole('button', { name: 'OnFadeDevice' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'OnFade2' })).toBeTruthy();

      fireEvent.click(screen.getByRole('button', { name: 'OnFade2' }));
      await waitFor(() => expect((store.value as any).on_action).toEqual({ mode: 'last_active_level', fade_time: 2 }));

      fireEvent.click(screen.getByRole('button', { name: 'OnFadeDevice' }));
      await waitFor(() => expect((store.value as any).on_action).toEqual({ mode: 'last_active_level', fade_time: -1 }));
    });
  });

  describe('schema ranges gate saving when enabled', () => {
    // The `scene` range is covered by "disabling the block clears action errors" above.
    test.each([
      ['OnLevel', 'percent', 200, { mode: 'level', percent: 1, fade_time: -1 }],
      ['OnDapc', 'value', 300, { mode: 'dapc', value: 1, fade_time: -1 }],
      ['OnLast', 'fade_time', 99, { mode: 'last_active_level', fade_time: -1 }],
    ])('in %s mode a %s outside the schema range blocks the block', async (mode, field, value, seeded) => {
      const store = buildStore();
      renderEditor(store);
      await enableBlock(store);
      fireEvent.click(screen.getByRole('button', { name: mode as string }));
      await waitFor(() => expect((store.value as any).on_action).toEqual(seeded));

      onActionStore(store).getParamByKey(field as string)!.store.setValue(value);
      await waitFor(() => expect(store.hasErrors).toBe(true));
    });
  });

  describe('mode description', () => {
    // A description on the mode field is rendered under the selector once shown.
    test('renders the mode schema description under the selector', async () => {
      const schemaWithHint = {
        ...BLOCK_SCHEMA,
        properties: {
          ...BLOCK_SCHEMA.properties,
          on_action: {
            ...ON_ACTION_SCHEMA,
            propertyOrder: 2,
            properties: {
              ...ON_ACTION_SCHEMA.properties,
              mode: { ...ON_ACTION_SCHEMA.properties.mode, description: 'OnModeHint' },
            },
          },
        },
      };
      const store = new ObjectStore(
        loadJsonSchema(schemaWithHint), { enabled: false }, false, new StoreBuilder(),
      );
      render(<JsonSchemaEditor store={store} translator={new Translator()} />);
      const checkbox = await screen.findByRole('checkbox');
      // hidden while the block is off, shown once enabled
      expect(screen.queryByText('OnModeHint')).toBeNull();

      fireEvent.click(checkbox);
      await waitFor(() => expect(screen.getByText('OnModeHint')).toBeTruthy());
    });
  });

  describe('required mode does not pre-activate fields while the block is off', () => {
    // Here `mode` is required and defaults to `level`, so the store sets it immediately;
    // the level field must still stay out of the value while the block is off.
    const REQUIRED_MODE_SCHEMA = {
      ...BLOCK_SCHEMA,
      properties: {
        ...BLOCK_SCHEMA.properties,
        on_action: {
          ...ON_ACTION_SCHEMA,
          required: ['mode'],
          propertyOrder: 2,
          properties: {
            ...ON_ACTION_SCHEMA.properties,
            mode: { ...ON_ACTION_SCHEMA.properties.mode, default: 'level' },
          },
        },
      },
    };

    test('block off keeps percent excluded; enabling seeds its default', async () => {
      const store = new ObjectStore(
        loadJsonSchema(REQUIRED_MODE_SCHEMA), { enabled: false }, false, new StoreBuilder(),
      );
      renderEditor(store);
      await screen.findByRole('checkbox');

      // block off: the level field is not pre-activated and nothing leaks into the value
      const percent = onActionStore(store).getParamByKey('percent')!;
      expect(percent.disabled).toBe(true);
      expect(store.value).toEqual({ enabled: false });

      // enabling activates the level field and seeds its default (minimum = 1)
      fireEvent.click(screen.getByRole('checkbox'));
      await waitFor(() => expect(percent.disabled).toBe(false));
      expect((store.value as any).on_action).toEqual({ mode: 'level', percent: 1, fade_time: -1 });
    });

    test('re-enabling re-seeds the level field instead of leaving it blank', async () => {
      const store = new ObjectStore(
        loadJsonSchema(REQUIRED_MODE_SCHEMA), { enabled: false }, false, new StoreBuilder(),
      );
      renderEditor(store);
      const checkbox = await screen.findByRole('checkbox');

      fireEvent.click(checkbox);
      await waitFor(() => expect((store.value as any).on_action).toEqual({ mode: 'level', percent: 1, fade_time: -1 }));

      // off, then on again: the action's setDefault blanks percent, it must be re-seeded
      fireEvent.click(checkbox);
      await waitFor(() => expect(store.value).toEqual({ enabled: false }));
      fireEvent.click(checkbox);
      await waitFor(() => expect((store.value as any).on_action).toEqual({ mode: 'level', percent: 1, fade_time: -1 }));
    });
  });

  describe('reveal on enable scrolls the block into view', () => {
    const flushTwoFrames = async () => {
      // the effect defers past two rAF ticks so the revealed actions are laid out
      await act(async () => {
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
      });
    };

    test('scrolls when the user turns the block on, not when it loads already on', async () => {
      const scrollIntoView = vi.fn();
      const original = Element.prototype.scrollIntoView;
      Element.prototype.scrollIntoView = scrollIntoView;
      try {
        const alreadyOn = buildStore({
          enabled: true,
          on_action: { mode: 'scene', scene: 5 },
          off_action: { mode: 'off' },
        });
        const { unmount } = renderEditor(alreadyOn);
        await screen.findByRole('checkbox');
        await flushTwoFrames();
        expect(scrollIntoView).not.toHaveBeenCalled();
        unmount();

        const store = buildStore();
        renderEditor(store);
        const checkbox = await screen.findByRole('checkbox');
        fireEvent.click(checkbox);
        await waitFor(() => expect(store.value).toEqual(FRESH_ENABLED_VALUE));
        await flushTwoFrames();
        expect(scrollIntoView).toHaveBeenCalledTimes(1);
        expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
      } finally {
        Element.prototype.scrollIntoView = original;
      }
    });
  });
});
