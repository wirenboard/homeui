import { useId } from 'react';
import { Password } from '@/components/password';
import { FieldLabel } from './field-label';
import { FormField } from './form-field';
import { type PasswordFieldProps } from './types';

export const PasswordField = ({
  title,
  value,
  description,
  error,
  defaultText,
  formStyle,
  showIndicator,
  onChange,
  ...rest
}: PasswordFieldProps) => {
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
      style={formStyle}
    >
      <FieldLabel title={title} inputId={inputId} />
      <Password
        id={inputId}
        value={value}
        ariaDescribedby={descriptionId}
        ariaInvalid={hasErrors}
        ariaErrorMessage={errorId}
        required={true}
        showIndicator={showIndicator}
        onChange={onChange}
        {...rest}
      />
    </FormField>
  );
};
