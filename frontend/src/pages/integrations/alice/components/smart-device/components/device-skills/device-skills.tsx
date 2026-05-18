import { observer } from 'mobx-react-lite';
import { DeviceCapabilities } from './device-capabilities';
import { DeviceProperties } from './device-properties';
import type { DeviceSkillsProps } from './types';
import './styles.css';

export const DeviceSkills = observer(({
  capabilities, properties, devicesStore, onCapabilityChange, onPropertyChange,
}: DeviceSkillsProps) => {

  return (
    <>
      <DeviceCapabilities
        capabilities={capabilities}
        devicesStore={devicesStore}
        onCapabilityChange={onCapabilityChange}
      />

      <DeviceProperties
        properties={properties}
        devicesStore={devicesStore}
        onPropertyChange={onPropertyChange}
      />
    </>
  );
});
