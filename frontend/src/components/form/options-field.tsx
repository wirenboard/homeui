import { useId } from 'react';
import { Dropdown, type Option } from '@/components/dropdown';
import { FieldLabel } from './field-label';
import { FormField } from './form-field';
import type { OptionsFieldProps } from './types';

export const OptionsField = ({
  title,
  value,
  description,
  error,
  options,
  placeholder,
  isDisabled,
  isClearable,
  isSearchable,
  formStyle,
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
      style={formStyle}
    >
      {!!title && <FieldLabel title={title} inputId={inputId} />}
      <Dropdown
        id={inputId}
        value={value as string}
        options={options}
        placeholder={placeholder}
        isClearable={isClearable}
        isDisabled={isDisabled}
        isSearchable={isSearchable}
        isInvalid={!!error}
        onChange={(option: Option<string>) => onChange(option?.value)}
      />
    </FormField>
  );
};
