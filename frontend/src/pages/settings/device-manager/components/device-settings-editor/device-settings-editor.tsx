import { useMediaQuery } from 'react-responsive';
import { DeviceSettingsEditorDesktop } from './device-settings-editor-desktop';
import { DeviceSettingsEditorMobile } from './device-settings-editor-mobile';
import type { DeviceSettingsEditorProps } from './types';

import './styles.css';

export const DeviceSettingsEditor = ({ store, translator } : DeviceSettingsEditorProps) => {
  const isMobile = useMediaQuery({ maxWidth: 991 });
  if (isMobile) {
    return <DeviceSettingsEditorMobile store={store} translator={translator} />;
  }
  return <DeviceSettingsEditorDesktop store={store} translator={translator} />;
};
