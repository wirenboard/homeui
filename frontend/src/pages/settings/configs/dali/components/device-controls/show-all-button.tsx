import { useTranslation } from 'react-i18next';
import ChevronDownIcon from '@/assets/icons/chevron-down.svg';
import ChevronUpIcon from '@/assets/icons/chevron-up.svg';
import type { ShowAllButtonProps } from './types';

export const ShowAllButton = ({ isExpanded, isDisabled, onToggle }: ShowAllButtonProps) => {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      className="daliDeviceControls-showAll"
      aria-label={t('dali.labels.all-controls')}
      aria-expanded={isExpanded}
      disabled={isDisabled}
      onClick={onToggle}
    >
      {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
    </button>
  );
};
