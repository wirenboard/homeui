import { useTranslation, getI18n } from 'react-i18next';
import type { ParamErrorProps } from './types';

export const ParamError = ({ id, error, translator }: ParamErrorProps) => {
  const { t } = useTranslation();
  const lang = getI18n().language;
  const text = error.key ? t(error.key, error.data) : translator.find(error.msg, lang);
  return <p id={id} className="wb-jsonEditor-errorText">{text}</p>;
};
