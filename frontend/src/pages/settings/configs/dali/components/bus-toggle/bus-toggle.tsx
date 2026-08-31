import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { Switch } from '@/components/switch';
import { useAsyncAction } from '@/utils/async-action';
import type { BusToggleProps } from './types';
import './styles.css';

export const BusToggle = observer(({
  label, description, value, onToggle,
}: BusToggleProps) => {
  const [toggle, isToggling] = useAsyncAction(async () => {
    await onToggle(!value);
  });

  return (
    <label className={classNames('dali-busToggle', { 'dali-busToggle-withDescription': description })}>
      <Switch
        value={value}
        ariaLabel={label}
        isDisabled={isToggling}
        onChange={toggle}
      />
      {description ? (
        <span className="dali-busToggle-content">
          <span>{label}</span>
          <span className="dali-busToggle-description">{description}</span>
        </span>
      ) : (
        <span>{label}</span>
      )}
    </label>
  );
});
