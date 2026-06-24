import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import MoreIcon from '@/assets/icons/more.svg';
import { Popup } from '@/components/popup';
import { Tooltip } from '@/components/tooltip';
import type { ConsoleMenuProps } from './types';
import './styles.css';

/** "More" (⋮) overflow menu used by the DALI bus monitor toolbar. */
export const ConsoleMenu = ({ renderContent }: ConsoleMenuProps) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popup
      className="daliMonitor-menu"
      isOpen={isOpen}
      placement="bottom-end"
      content={<div className="daliMonitor-menuContent">{renderContent(() => setIsOpen(false))}</div>}
      onOpenChange={setIsOpen}
    >
      <Tooltip text={t('dali.buttons.menu')}>
        <button className="consolePanel-button" aria-label={t('dali.buttons.menu')}>
          <MoreIcon className="consolePanel-icon" />
        </button>
      </Tooltip>
    </Popup>
  );
};
