import { useId } from 'react';
import { Checkbox } from '@/components/checkbox';
import { FormField } from './form-field';
import type { BooleanFieldProps } from './types';

const BooleanField = ({
  title,
  value,
  description,
  error,
  onChange,
}: BooleanFieldProps) => {
  const descriptionId = useId();
  const errorId = useId();
  return (
    <FormField
      description={description}
      error={error}
      descriptionId={descriptionId}
      errorId={errorId}
    >
      <Checkbox
        title={title}
        checked={value}
        onChange={onChange}
      />
    </FormField>
  );
};

export default BooleanField;
