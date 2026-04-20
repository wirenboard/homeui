import { useId } from 'react';
import { Checkbox } from '@/components/checkbox';
import { Switch } from '@/components/switch';
import { FormField } from './form-field';
import type { BooleanFieldProps } from './types';

export const BooleanField = ({
  title,
  value,
  description,
  error,
  isDisabled,
  view = 'switch',
  formStyle,
  onChange,
}: BooleanFieldProps) => {
  const inputId = useId();
  const descriptionId = useId();
  const errorId = useId();
  return (
    <FormField
      description={description}
      error={error}
      descriptionId={descriptionId}
      errorId={errorId}
      style={formStyle}
    >
      <label className="form-fieldSwitch">
        {view === 'switch' ? (
          <Switch
            id={inputId}
            value={value}
            ariaLabel={title}
            isDisabled={isDisabled}
            ariaDescribedby={descriptionId}
            onChange={onChange}
          />
        ) : (
          <Checkbox
            id={inputId}
            checked={value}
            ariaLabel={title}
            isDisabled={isDisabled}
            ariaDescribedby={descriptionId}
            onChange={onChange}
          />
        )}
        <span>{title}</span>
      </label>
    </FormField>
  );
};
