import type { FieldErrorProps } from './types';

export const FieldError = ({ id, error }: FieldErrorProps) => {
  return <p id={id} className="form-errorText">{error}</p>;
};
