import { observer } from 'mobx-react-lite';
import { Switch } from '@/components/switch';
import { useAsyncAction } from '@/utils/async-action';
import type { BusToggleProps } from './types';
import './styles.css';

export const BusToggle = observer(({ label, value, onToggle }: BusToggleProps) => {
  const [toggle, isToggling] = useAsyncAction(async () => {
    await onToggle(!value);
  });

  return (
    <label className="dali-busToggle">
      <Switch
        value={value}
        ariaLabel={label}
        isDisabled={isToggling}
        onChange={toggle}
      />
      <span>{label}</span>
    </label>
  );
});
