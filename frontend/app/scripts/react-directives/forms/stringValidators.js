'use strict';

import i18n from '../../i18n/react/config';

export const makeNotEmptyValidator = error => {
  return value => (!value ? (error ? error : i18n.t('validator.errors.empty')) : null);
};

export const makeMinLengthValidator = minLength => {
  return value => {
    if (!value || value.length < minLength) {
      return i18n.t('validator.errors.min-length', { min: minLength });
    }
    return null;
  };
};
