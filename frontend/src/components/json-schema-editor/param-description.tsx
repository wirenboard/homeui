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

export const ParamDescription = ({ id, description, defaultText }: ParamDescriptionProps) => {
  return (
    <p id={id} className="wb-jsonEditor-propertyDescription">
      {description && <span>{description} </span>}
      <ParamDefaultText defaultText={defaultText} />
    </p>
  );
};
