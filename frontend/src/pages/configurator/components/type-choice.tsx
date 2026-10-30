import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import type { TypeChoiceProps } from '../types';
import { typeName, typeShortName } from '../utils';

export const TypeChoice = ({ types, value, ariaLabel, onChange }: TypeChoiceProps) => {
  const { t } = useTranslation();

  return (
    <div className="configurator-choice" role="group" aria-label={ariaLabel}>
      <span className="configurator-choiceLabel">{t('configurator.labels.type')}</span>
      {types.length > 1 ? types.map((typeId) => (
        <Button
          key={typeId}
          size="small"
          variant={typeId === value ? 'primary' : 'secondary'}
          label={typeShortName(typeId)}
          aria-pressed={typeId === value}
          onClick={() => onChange(typeId)}
        />
      )) : <span>{typeName(types[0])}</span>}
    </div>
  );
};
