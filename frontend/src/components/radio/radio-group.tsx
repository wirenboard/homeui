import classNames from 'classnames';
import { Radio } from './radio';
import { type RadioGroupProps } from './types';
import './styles.css';

export const RadioGroup = ({ options, layout = 'vertical', value, onChange, name }: RadioGroupProps) => {
  return (
    <div className={classNames('radioGroup', `radioGroup--${layout}`)}>
      {options.map((option, i) => (
        <Radio
          key={option.id || i}
          id={option.id}
          label={option.label}
          ariaLabel={option.ariaLabel}
          isDisabled={option.isDisabled}
          checked={option.value === value}
          name={name}
          onChange={() => onChange(option.value)}
        />
      ))}
    </div>
  );
};
