import { useTranslation } from 'react-i18next';
import ChevronDownIcon from '@/assets/icons/chevron-down.svg';
import ChevronUpIcon from '@/assets/icons/chevron-up.svg';
import { Button } from '@/components/button';
import type { ShowAllButtonProps } from './types';

export const ShowAllButton = ({ isExpanded, isDisabled, onToggle }: ShowAllButtonProps) => {
  const { t } = useTranslation();

  return (
    <Button
      className="daliDeviceControls-showAll"
      icon={isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
      aria-label={t('dali.labels.all-controls')}
      aria-expanded={isExpanded}
      variant="secondary"
      size="small"
      isOutlined
      disabled={isDisabled}
      onClick={onToggle}
    />
  );
};
