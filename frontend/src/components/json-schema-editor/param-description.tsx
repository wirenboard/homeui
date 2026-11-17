import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ParamDescriptionProps } from './types';

export const ParamDefaultText = ({ defaultText } : { defaultText: string }) => {
  const { t } = useTranslation();
  return (
    <>
      {t('forms.default-text-prefix')}
      <span className="wb-jsonEditor-defaultText">{defaultText}</span>
      {t('forms.default-text-postfix')}
    </>
  );
};

export const DescriptionText = ({ description } : { description: string }) => {
  const formattedDescription = useMemo(() => {
    return description.replace(/<br>/gi, '\n');
  }, [description]);
  return (
    <span className="wb-jsonEditor-descriptionText">{formattedDescription} </span>
  );
};

export const ParamDescription = ({ id, description, defaultText }: ParamDescriptionProps) => {
  return (
    <p id={id} className="wb-jsonEditor-propertyDescription">
      {description && <DescriptionText description={description} />}
      {defaultText && <ParamDefaultText defaultText={defaultText} />}
    </p>
  );
};
