import i18n from 'i18next';
import { createRoot } from 'react-dom/client';
import { initReactI18next } from 'react-i18next';
import { DeviceSettingsWasm } from '@/pages/settings/device-manager/device-settings-wasm';
import engLocale from '~/scripts/i18n/react/locales/en/translations.json';
import ruLocale from '~/scripts/i18n/react/locales/ru/translations.json';
import { TabType } from '~/scripts/react-directives/device-manager/config-editor/tabsStore';
import DeviceManagerPage from '~/scripts/react-directives/device-manager/deviceManagerPage';
import DeviceManagerPageStore from '~/scripts/react-directives/device-manager/DeviceManagerPageStore';
import '@/assets/styles/variables.css';
import '@/assets/styles/animations.css';
import '~/styles/main.css';
import '~/styles/css/bootstrap.min.css';
import '~/styles/css/new.css';
import '~/styles/css/device-manager.css';

i18n.use(initReactI18next).init({
  fallbackLng: 'en',
  lng: 'en',
  resources: {
    en: {
      translations: engLocale,
    },
    ru: {
      translations: ruLocale,
    },
  },
  ns: ['translations'],
  defaultNS: 'translations',
  react: {
    transSupportBasicHtmlNodes: true,
  },
});

i18n.languages = ['en', 'ru'];

// const response = {
//   config: {},
//   schema: {},
//   types: [],
// };
//
// const loadConfig = async () => {
//   return {
//     config: response.config,
//     schema: response.schema,
//     deviceTypeGroups: response.types,
//   };
// };
//
// const saveConfig = () => {};
// const stateTransitions = {
//   toMobileContent: () => {},
//   toScan: () => {},
//   toTabs: () => {},
//   onLeaveScan: (selectedDevices) => {},
//   onLeaveSearchDisconnectedDevice: (selectedDevice) => {},
// };
//
// const loadDeviceTypeSchema = async (deviceType) => {
//   try {
//     return getSchema();
//     // return await SerialProxy.GetSchema({ type: deviceType });
//   } catch (err) {
//     throw new Error(err.message + (err.data ? ': ' + err.data : ''));
//   }
// };
//
// const rolesFactory = {
//   checkRights: () => true,
// };
// const DeviceManagerProxy = {};
// const FwUpdateProxy = {};
// const setupPort = () => {};
//
// const store = new DeviceManagerPageStore(
//   loadConfig,
//   saveConfig,
//   stateTransitions,
//   loadDeviceTypeSchema,
//   rolesFactory,
//   DeviceManagerProxy,
//   FwUpdateProxy,
//   setupPort
// );

// store.addWbDevice = async () => {
//   // await Module.serial.select(true);
//   await new PortScan().scan();
//   // debugger;
// };

const scan = async () => {
  // await Module.serial.select(true);
  // console.log(11);
  return new PortScan().exec().then(({ devices }) => {
    console.log(devices);
    return devices;
  });
};

// store.loadConfig();
//
// store.configEditorPageStore.hideButtons = true;

// setTimeout(() => {
//   store.configEditorPageStore.tabs.items = store.configEditorPageStore.tabs.items
//     .filter((item) => item.type === TabType.DEVICE);
// });

createRoot(document.querySelector('#root')).render(
  <DeviceSettingsWasm scan={scan} />
);
