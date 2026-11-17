import { useMediaQuery } from 'react-responsive';
import { MIN_TABLET_WIDTH } from '@/common/breakpoints';
import { DeviceSettingsEditorDesktop } from './device-settings-editor-desktop';
import { DeviceSettingsEditorMobile } from './device-settings-editor-mobile';
import type { DeviceSettingsEditorProps } from './types';

import './styles.css';

export const DeviceSettingsEditor = ({ store, translator, showChannels = true } : DeviceSettingsEditorProps) => {
  const showChannelsTable = useMediaQuery({ minWidth: MIN_TABLET_WIDTH });
  if (showChannelsTable) {
    return <DeviceSettingsEditorDesktop store={store} translator={translator} showChannels={showChannels} />;
  }
  return <DeviceSettingsEditorMobile store={store} translator={translator} />;
};
