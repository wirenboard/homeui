import { useTranslation } from 'react-i18next';
import ChevronDownIcon from '@/assets/icons/chevron-down.svg';
import ChevronRightIcon from '@/assets/icons/chevron-right.svg';
import type { DeviceFoldProps } from '../types';
import { TYPE_ICONS, UNESCAPED } from '../utils';

// Сводка устройства в шапке: типы строк, сколько выбрано, и кнопка сворачивания.
export const DeviceFold = ({
  title, types, picked, isFolded, onToggle,
}: DeviceFoldProps) => {
  const { t } = useTranslation();
  return (
    <span className="configurator-wbSummary">
      <span className="configurator-wbModelIcons" aria-hidden="true">
        {Array.from(new Set(types)).map((type) => {
          const Icon = TYPE_ICONS[type];
          return <Icon key={type} className="configurator-typeIcon" />;
        })}
      </span>
      {!!picked && t('configurator.labels.wb-devices-count', { count: picked })}
      <button
        type="button"
        className="configurator-collapse"
        aria-expanded={!isFolded}
        aria-label={t('configurator.labels.toggle-device', { ...UNESCAPED, title })}
        onClick={onToggle}
      >
        {isFolded ? <ChevronRightIcon /> : <ChevronDownIcon />}
      </button>
    </span>
  );
};
