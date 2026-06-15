import { useState, type ReactNode } from 'react';
import MoreIcon from '@/assets/icons/more.svg';
import { Button } from '@/components/button';
import { Popup } from '@/components/popup';

interface OptionsPopupProps {
  ariaLabel: string;
  modifiedCount: number;
  children: ReactNode;
}

// Kebab button + popup container shared by capability and property option popups
// Counts of modified options are rendered as a badge on the kebab icon
export const OptionsPopup = ({ ariaLabel, modifiedCount, children }: OptionsPopupProps) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Popup
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      placement="bottom-end"
      content={<div className="aliceDeviceSkills-optionsContent">{children}</div>}
    >
      <span className="aliceDeviceSkills-optionsButtonWrapper">
        <Button
          size="small"
          type="button"
          icon={<MoreIcon />}
          variant="secondary"
          title={ariaLabel}
          aria-label={ariaLabel}
        />
        {modifiedCount > 0 && (
          <span className="aliceDeviceSkills-optionsBadge">{modifiedCount}</span>
        )}
      </span>
    </Popup>
  );
};

interface OptionsItemProps {
  isModified: boolean;
  children: ReactNode;
}

// Single option row inside the popup; carries the modified accent border
export const OptionsItem = ({ isModified, children }: OptionsItemProps) => (
  <div className={`aliceDeviceSkills-optionsItem${isModified ? ' is-modified' : ''}`}>
    {children}
  </div>
);

// Horizontal divider between options
export const OptionsDivider = () => (
  <div className="aliceDeviceSkills-optionsDivider" />
);
