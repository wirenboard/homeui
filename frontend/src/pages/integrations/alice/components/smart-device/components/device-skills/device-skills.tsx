import { observer } from 'mobx-react-lite';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { DeviceCapabilities } from './device-capabilities';
import { DeviceProperties } from './device-properties';
import type { DeviceSkillsParams } from './types';
import './styles.css';

export const DeviceSkills = observer(({
  capabilities, properties, deviceStore, onCapabilityChange, onPropertyChange,
}: DeviceSkillsParams) => {
  const { t } = useTranslation();

  return (
    <>
      <DeviceCapabilities
        capabilities={capabilities}
        deviceStore={deviceStore}
        onCapabilityChange={onCapabilityChange}
      />
      
      <DeviceProperties
        properties={properties}
        deviceStore={deviceStore}
        onPropertyChange={onPropertyChange}
      />
    </>
  );
});
