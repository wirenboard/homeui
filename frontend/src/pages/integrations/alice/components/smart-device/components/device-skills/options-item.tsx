import { type ReactNode } from 'react';

interface OptionsItemProps {
  isModified: boolean;
  children: ReactNode;
}

// Single option row inside the popup
// When `isModified` is true, the row gets an accent border on the left
export const OptionsItem = ({ isModified, children }: OptionsItemProps) => (
  <div className={`aliceDeviceSkills-optionsItem${isModified ? ' is-modified' : ''}`}>
    {children}
  </div>
);
