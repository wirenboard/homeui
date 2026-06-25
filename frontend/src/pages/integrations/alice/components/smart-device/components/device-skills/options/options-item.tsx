import classNames from 'classnames';
import type { OptionsItemProps } from './types';

// Single option row inside the popup
// When `isModified` is true, the row gets an accent border on the left
export const OptionsItem = ({ isModified, children }: OptionsItemProps) => (
  <div className={classNames('aliceDeviceSkills-optionsItem', { 'is-modified': isModified })}>
    {children}
  </div>
);
