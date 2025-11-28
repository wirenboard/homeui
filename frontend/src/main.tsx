import i18n from 'i18next';
import { createRoot } from 'react-dom/client';
import { initReactI18next } from 'react-i18next';
import { DeviceSettingsWasm } from '@/pages/settings/device-manager/device-settings-wasm';
import engLocale from '~/i18n/react/locales/en/translations.json';
import ruLocale from '~/i18n/react/locales/ru/translations.json';
import '@/assets/styles/variables.css';
import '@/assets/styles/animations.css';
import '~styles/main.css';
import '~styles/css/bootstrap.min.css';
import '~styles/css/new.css';
import '~styles/css/device-manager.css';

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

const scan = async () => {
  return new PortScan().exec().then(({ devices }) => devices);
};

const loadConfig = async (cfg = {}) => {
  return Module.request('deviceLoadConfig', cfg);
};

const configGetDeviceTypes = async () => {
  return Module.request('configGetDeviceTypes', { lang: 'ru' });
};

const configGetSchema = async (deviceType) => {
  return Module.request('configGetSchema',  { type: 'deviceType' });
};

createRoot(document.querySelector('#root')).render(
  <DeviceSettingsWasm
    scan={scan}
    loadConfig={loadConfig}
    configGetSchema={configGetSchema}
    configGetDeviceTypes={configGetDeviceTypes}
  />
);
