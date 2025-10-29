import { HTMLAttributes } from 'react';
import './styles.css';

/*
 @description Component to combine input and buttons in single line
 */
export const FormGroup = ({ children }: HTMLAttributes<HTMLDivElement>) => (
  <div className="formFields-group">
    {children}
  </div>
);
