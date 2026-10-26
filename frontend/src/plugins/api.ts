import i18n from '@/i18n/config';
import { consolePanelStore } from '@/stores/console-panel';
import { devicesStore } from '@/stores/devices';
import { rulesStore } from '@/stores/rules';
import { ruleEditorSlot } from './rule-editor-slot';
import type { DeviceSnapshot, PluginApi } from './types';

const devices = (): DeviceSnapshot[] => [...devicesStore.devices.values()]
  .filter((device) => !device.isServiceDevice)
  .map((device) => ({
    id: device.id,
    title: device.name,
    controls: device.visibleCells.map((cell) => ({
      id: cell.controlId,
      title: cell.name,
      type: cell.type,
      value: cell.value,
      units: cell.units,
      readonly: cell.readOnly,
    })),
  }));

/** Module namespaces of the libraries plugins share with the app, by import name. */
const loadLibs = async () => {
  const names = ['react', 'react/jsx-runtime', 'mobx', 'mobx-react-lite', '@codemirror/state', '@codemirror/view'];
  const modules = await Promise.all([
    import('react'),
    import('react/jsx-runtime'),
    import('mobx'),
    import('mobx-react-lite'),
    import('@codemirror/state'),
    import('@codemirror/view'),
  ]);
  return Object.fromEntries(names.map((name, i) => [name, modules[i]]));
};

export const createPluginApi = async (): Promise<PluginApi> => ({
  version: 1,
  libs: await loadLibs(),
  consolePanel: {
    registerTab: consolePanelStore.registerTab,
    show: consolePanelStore.show,
  },
  ruleEditor: {
    addExtension: ruleEditorSlot.addExtension,
    addAction: ruleEditorSlot.addAction,
    get view() {
      return ruleEditorSlot.view;
    },
    get rule() {
      const { name, content, error } = rulesStore.rule;
      return { name, content, error };
    },
  },
  devices,
  ruleLogs: (count) => rulesStore.logs.slice(-count).map(({ level, payload }) => ({ level, payload })),
  language: () => i18n.language,
});
