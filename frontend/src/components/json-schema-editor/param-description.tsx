import { useTranslation } from 'react-i18next';

export interface ParamDescriptionProps {
  id?: string;
  description?: string;
  defaultText?: string;
}

export const ParamDescription = ({ id, description, defaultText }: ParamDescriptionProps) => {
  const { t } = useTranslation();
  if (defaultText) {
    return (
      <p id={id} className="wb-jsonEditor-propertyDescription">
        {description && (<>{description} </>)}
        {t('forms.default-text-prefix')}
        <span className="wb-jsonEditor-defaultText">{defaultText}</span>
        {t('forms.default-text-postfix')}
      </p>
    );
  }
  if (description) {
    return <p id={id}>{description}</p>;
  }
  return null;
};
