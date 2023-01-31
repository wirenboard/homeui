import React from 'react';
import { useTranslation } from 'react-i18next';

function WarningTag({text}) {
    return <span className='tag bg-warning text-nowrap'>{text}</span>;
}

function ErrorTag({text}) {
    return <span className='tag bg-danger text-nowrap'>{text}</span>;
}

function FirmwareVersionWithLabels({version, available_fw, ext_support}) {
    const { t } = useTranslation();
    let str = version;
    if (available_fw) {
      const text = t('device-manager.labels.available') + ' ' + available_fw;
      str = [str, <WarningTag text={text}/>];
    }
    return [str, ext_support && <span class="glyphicon glyphicon-flash"></span>];
  }

export { WarningTag, ErrorTag, FirmwareVersionWithLabels };
