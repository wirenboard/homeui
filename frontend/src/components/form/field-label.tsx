import type { FieldLabelProps } from './types';

export const FieldLabel = ({ title, inputId }: FieldLabelProps) => {
  return (
    <label htmlFor={inputId} className="form-fieldLabel">
      {title}
    </label>
  );
};
