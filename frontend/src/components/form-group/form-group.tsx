import { HTMLAttributes } from 'react';
import './styles.css';

export const FormGroup = ({ children }: HTMLAttributes<HTMLDivElement>) => (
  <div className="formFields-group">
    {children}
  </div>
);
