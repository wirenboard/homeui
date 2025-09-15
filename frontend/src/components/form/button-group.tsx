import { ReactNode } from 'react';

const FormButtonGroup = ({ children }: { children?: ReactNode }) => {
  return (
    <div className="form-buttonGroup">
      {children}
    </div>
  );
};

export default FormButtonGroup;
