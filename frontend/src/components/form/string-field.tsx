import { useId } from 'react';
import { Input } from '@/components/input';
import { Textarea } from '@/components/textarea';
import { FieldLabel } from './field-label';
import { FormField } from './form-field';
import type { StringFieldProps } from './types';

export const StringField = ({
  title,
  value,
  description,
  error,
  defaultText,
  view = 'input',
  type = 'text',
  onChange,
  formStyle,
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
      style={formStyle}
    >
      {title && <FieldLabel title={title} inputId={inputId} />}
      {view === 'input' ? (
        <Input
          id={inputId}
          type={type}
          value={value as string}
          isInvalid={!!error}
          ariaDescribedby={descriptionId}
          ariaInvalid={hasErrors}
          ariaErrorMessage={errorId}
          onChange={onChange}
          {...rest}
        />
      ) : (
        <Textarea
          id={inputId}
          value={value as string}
          isInvalid={!!error}
          ariaDescribedby={descriptionId}
          ariaInvalid={hasErrors}
          ariaErrorMessage={errorId}
          onChange={onChange}
          {...rest}
        />
      )}
    </FormField>
  );
};
