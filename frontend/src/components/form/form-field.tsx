import classNames from 'classnames';
import { PropsWithChildren } from 'react';
import { FieldDescription } from './field-description';
import { FieldError } from './field-error';
import type { FormFieldProps } from './types';

export const FormField = ({
  children,
  description,
  error,
  defaultText,
  descriptionId,
  errorId,
}: PropsWithChildren<FormFieldProps>) => {
  const showError = !!error;
  const showDescription = description || defaultText;
  return (
    <div className={classNames('form-field', { 'form-fieldError': showError })} >
      {children}
      {showError && <FieldError id={errorId} error={error} />}
      {showDescription && (
        <FieldDescription
          id={descriptionId}
          description={description}
          defaultText={defaultText}
        />
      )}
    </div>
  );
};
