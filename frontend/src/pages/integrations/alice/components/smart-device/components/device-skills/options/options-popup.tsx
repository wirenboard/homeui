import { useState, type ReactNode } from 'react';
import MoreIcon from '@/assets/icons/more.svg';
import { Button } from '@/components/button';
import { Popup } from '@/components/popup';

interface OptionsPopupProps {
  ariaLabel: string;
  modifiedCount: number;
  children: ReactNode;
}

// Kebab button that opens a popup with the option checkboxes inside
// `modifiedCount` is rendered as a badge in the top-right corner of the button
export const OptionsPopup = ({ ariaLabel, modifiedCount, children }: OptionsPopupProps) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Popup
      isOpen={isOpen}
      placement="bottom-end"
      content={<div className="aliceDeviceSkills-optionsContent">{children}</div>}
      onOpenChange={setIsOpen}
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
