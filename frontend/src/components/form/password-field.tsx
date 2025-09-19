import { useId } from 'react';
import { Password } from '@/components/password';
import { FieldLabel } from './field-label';
import { FormField } from './form-field';
import type { StringFieldProps } from './types';

export const PasswordField = ({
  title,
  value,
  description,
  error,
  defaultText,
  onChange,
  ...rest
}: StringFieldProps) => {
  const inputId = useId();
  const descriptionId = useId();
  const errorId = useId();
  const hasErrors = !!error;
  return (
    <FormField
      description={description}
      error={error}
      defaultText={defaultText}
      descriptionId={descriptionId}
      errorId={errorId}
    >
      <FieldLabel title={title} inputId={inputId} />
      <Password
        id={inputId}
        value={value}
        ariaDescribedby={descriptionId}
        ariaInvalid={hasErrors}
        ariaErrorMessage={errorId}
        required={true}
        onChange={onChange}
        {...rest}
      />
    </FormField>
  );
};
