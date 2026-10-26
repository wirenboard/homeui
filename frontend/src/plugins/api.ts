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
const SHARED_LIBS = {
  react: () => import('react'),
  'react/jsx-runtime': () => import('react/jsx-runtime'),
  mobx: () => import('mobx'),
  'mobx-react-lite': () => import('mobx-react-lite'),
  '@codemirror/state': () => import('@codemirror/state'),
  '@codemirror/view': () => import('@codemirror/view'),
  '@codemirror/language': () => import('@codemirror/language'),
};

const loadLibs = async () => Object.fromEntries(
  await Promise.all(Object.entries(SHARED_LIBS).map(async ([name, load]) => [name, await load()])),
);

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
