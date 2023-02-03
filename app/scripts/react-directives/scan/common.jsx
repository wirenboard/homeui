import React from 'react';
import { useTranslation } from 'react-i18next';

export function FirmwareVersionWithLabels({ version, availableFw, extSupport }) {
  const { t } = useTranslation();
  return (
    <>
      {version}
      {availableFw && (
        <WarningTag text={t('device-manager.labels.available', { version: availableFw })} />
      )}
      {extSupport && <span class="glyphicon glyphicon-flash"></span>}
    </>
  );
}
