import { PropsWithChildren } from 'react';
import { Card } from '@/components/card';
import type {FieldGroupProps} from './types';

const FormFieldGroup = ({ children, heading }: PropsWithChildren<FieldGroupProps>) => {
  return (
    <Card heading={heading} variant="secondary" className="form-fieldGroup">
      {children}
    </Card>
  );
};

export default FormFieldGroup;
