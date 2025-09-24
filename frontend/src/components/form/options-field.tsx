import { useId } from 'react';
import { Dropdown } from '@/components/dropdown';
import { FieldLabel } from './field-label';
import { FormField } from './form-field';
import type { OptionsFieldProps } from './types';

export const OptionsField = ({
  title,
  value,
  description,
  error,
  options,
  isDisabled,
  isSearchable,
  onChange,
}: OptionsFieldProps) => {
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
      <FieldLabel title={title} inputId={inputId} />
      <Dropdown
        id={inputId}
        value={value}
        options={options}
        isDisabled={isDisabled}
        isSearchable={isSearchable}
        onChange={(option) => onChange(option.value)}
      />
    </FormField>
  );
};
