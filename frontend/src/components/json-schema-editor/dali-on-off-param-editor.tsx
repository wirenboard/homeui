import { runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { type ObjectParamStore, type ObjectStore } from '@/stores/json-schema-editor';
import ObjectEditor from './object-param-editor';
import { DaliOnOffActionMode, type DaliOnOffEditorProps } from './types';

const ENABLED_KEY = 'enabled';
const ACTION_KEYS = ['on_action', 'off_action'];
const MODE_KEY = 'mode';
const FADE_TIME_KEY = 'fade_time';

// Fields each mode puts into the value; an action that has no such param is skipped.
const MODE_FIELDS: Record<DaliOnOffActionMode, string[]> = {
  [DaliOnOffActionMode.Scene]: ['scene'],
  [DaliOnOffActionMode.LastActiveLevel]: [FADE_TIME_KEY],
  [DaliOnOffActionMode.Level]: ['percent', FADE_TIME_KEY],
  [DaliOnOffActionMode.Dapc]: ['value', FADE_TIME_KEY],
  [DaliOnOffActionMode.Off]: [],
};

// A mode from a newer wb-mqtt-dali is unknown here, so none of its fields apply.
const isActionMode = (value: unknown): value is DaliOnOffActionMode =>
  typeof value === 'string' && Object.hasOwn(MODE_FIELDS, value);

const readMode = (action: ObjectStore): DaliOnOffActionMode | undefined => {
  const value = action.getParamByKey(MODE_KEY)?.store.value;
  return isActionMode(value) ? value : undefined;
};

const reconcileAction = (param: ObjectParamStore) => {
  const action = param.store as ObjectStore;
  param.enable();
  // Mode first: it decides which of the other fields belong to the value. The schema
  // does not mark it required, so it is enabled here.
  action.getParamByKey(MODE_KEY)?.enable();
  const mode = readMode(action);
  const applicable = new Set<string>(mode === undefined ? [] : MODE_FIELDS[mode]);
  action.params.forEach((field) => {
    if (field.key === MODE_KEY) {
      return;
    }
    if (applicable.has(field.key)) {
      field.enable();
    } else {
      field.disable();
    }
  });
};

// The checkbox gates the actions and each `mode` gates its fields, both through
// enable/disable, so the value, the errors and what ObjectEditor shows follow from it.
const reconcileOnOffBlock = (store: ObjectStore, enabled: boolean) => {
  ACTION_KEYS.forEach((key) => {
    const param = store.getParamByKey(key);
    if (!param) {
      return;
    }
    if (enabled) {
      reconcileAction(param);
      return;
    }
    param.disable();
    // Drop the seeded defaults so a check then uncheck doesn't leave the form dirty.
    (param.store as ObjectStore).reset();
  });
};

// Thin wrapper over ObjectEditor: it only drives the rules above and scrolls the
// block into view when it is switched on, everything is rendered by ObjectEditor.
const DaliOnOffEditor = observer(({
  store,
  rootStore,
  translator,
  editorBuilder,
  isTopLevel,
}: DaliOnOffEditorProps) => {
  const enabledParam = store.getParamByKey(ENABLED_KEY);
  const enabled = enabledParam?.store.value === true;
  const [onAction, offAction] = ACTION_KEYS.map(
    (key) => store.getParamByKey(key)?.store as ObjectStore | undefined,
  );
  // Read the modes so the effect re-runs (and fields re-reconcile) when they change.
  const onMode = onAction && readMode(onAction);
  const offMode = offAction && readMode(offAction);

  useLayoutEffect(() => {
    runInAction(() => reconcileOnOffBlock(store, enabled));
  }, [store, enabled, onMode, offMode]);

  // The block sits at the bottom of a long form, so show what enabling it revealed.
  const containerRef = useRef<HTMLDivElement>(null);
  const wasEnabled = useRef(enabled);
  useEffect(() => {
    const revealed = enabled && !wasEnabled.current;
    wasEnabled.current = enabled;
    if (!revealed) {
      return undefined;
    }
    // The actions appear in a MobX-driven re-render after this effect, so the scroll
    // waits for it; `start` because only the already visible header would be `nearest`.
    let innerRaf = 0;
    const outerRaf = requestAnimationFrame(() => {
      innerRaf = requestAnimationFrame(() => {
        containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
    return () => {
      cancelAnimationFrame(outerRaf);
      cancelAnimationFrame(innerRaf);
    };
  }, [enabled]);

  if (!enabledParam) {
    return null;
  }

  return (
    <div ref={containerRef}>
      <ObjectEditor
        store={store}
        rootStore={rootStore}
        translator={translator}
        editorBuilder={editorBuilder}
        isTopLevel={isTopLevel}
      />
    </div>
  );
});

export default DaliOnOffEditor;
