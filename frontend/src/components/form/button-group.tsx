import { ReactNode } from 'react';

export const FormButtonGroup = ({ children }: { children: ReactNode }) => {
  return (
    <div className="form-buttonGroup">
      {children}
    </div>
  );
};
