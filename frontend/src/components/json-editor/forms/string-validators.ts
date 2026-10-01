import i18n from '@/i18n/config';

export const makeNotEmptyValidator = (error) => {
  return (value) => (!value ? (error ? error : i18n.t('validator.errors.empty')) : null);
};

export const makeMinLengthValidator = (min: number) => {
  return (value: string) => {
    if (!value || value.length < min) {
      return i18n.t('validator.errors.min-length', { min });
    }
    return null;
  };
};
