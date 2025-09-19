import { useId } from 'react';
import { Switch } from '@/components/switch';
import { FormField } from './form-field';
import type { BooleanFieldProps } from './types';

export const BooleanField = ({
  title,
  value,
  description,
  error,
  isDisabled,
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
    >
      <div className="form-fieldSwitch">
        <Switch
          id={inputId}
          value={value}
          ariaLabel={title}
          isDisabled={isDisabled}
          onChange={onChange}
        />
        <span>{title}</span>
      </div>
    </FormField>
  );
};
