import { observer } from 'mobx-react-lite';
import { DeviceCapabilities } from './device-capabilities';
import { DeviceProperties } from './device-properties';
import type { DeviceSkillsProps } from './types';
import './styles.css';

export const DeviceSkills = observer(({
  capabilities, properties, onCapabilityChange, onPropertyChange,
}: DeviceSkillsProps) => {

  return (
    <>
      <DeviceCapabilities
        capabilities={capabilities}
        onCapabilityChange={onCapabilityChange}
      />

      <DeviceProperties
        properties={properties}
        onPropertyChange={onPropertyChange}
      />
    </>
  );
});
