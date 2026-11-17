import { useTranslation } from 'react-i18next';
import type { ParamErrorProps } from './types';

export const ParamError = ({ id, error, translator }: ParamErrorProps) => {
  if (!error) {
    return null;
  }
  const { t, i18n } = useTranslation();
  const text = error.key ? t(error.key, error.data) : translator.find(error.msg, i18n.language);
  return <p id={id} className="wb-jsonEditor-errorText">{text}</p>;
};
