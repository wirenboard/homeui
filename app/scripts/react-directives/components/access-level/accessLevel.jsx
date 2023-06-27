'use strict';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';

const AccessLevelErrorBanner = observer(({ store, children }) => {
  const { t } = useTranslation();
  if (!store || store.accessGranted) {
    return <>{children}</>;
  }
  return (
    <div className="alert alert-danger" role="alert">
      <span> {t('errors.access-failed')}</span>
      <a href="#!/access-level">{t('errors.access-failed-link-text')}</a>
    </div>
  );
});

export default AccessLevelErrorBanner;
