import { useTranslation, getI18n } from 'react-i18next';
import { ValidationError, Translator } from '@/stores/json-schema-editor';

interface ParamErrorProps {
  id?: string;
  error: ValidationError | undefined;
  translator: Translator;
}

export const ParamError = ({ id, error, translator }: ParamErrorProps) => {
  const { t } = useTranslation();
  const lang = getI18n().language;
  if (error !== undefined) {
    if (error.key){
      return <p id={id} className="wb-jsonEditor-errorText">{t(error.key, error.data)}</p>;
    }
    return <p id={id} className="wb-jsonEditor-errorText">{translator.find(error.msg, lang)}</p>;
  }
  return null;
};
