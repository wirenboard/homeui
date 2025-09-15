import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { FieldDescriptionProps } from './types';

export const FieldDefaultText = ({ defaultText } : { defaultText: string }) => {
  const { t } = useTranslation();
  return (
    <>
      {t('forms.default-text-prefix')}
      <span className="form-defaultText">{defaultText}</span>
      {t('forms.default-text-postfix')}
    </>
  );
};

export const DescriptionText = ({ description } : { description: string }) => {
  const formattedDescription = useMemo(() => {
    return description.replace(/<br>/gi, '\n');
  }, [description]);
  return (
    <span className="form-descriptionText">{formattedDescription} </span>
  );
};

export const FieldDescription = ({ id, description, defaultText }: FieldDescriptionProps) => {
  return (
    <p id={id} className="form-fieldDescription">
      {description && <DescriptionText description={description} />}
      {defaultText && <FieldDefaultText defaultText={defaultText} />}
    </p>
  );
};
