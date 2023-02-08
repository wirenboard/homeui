import React from 'react';
import { useTranslation } from 'react-i18next';

function WarningTag({text}) {
    return <span className='tag bg-warning text-nowrap'>{text}</span>;
}

function ErrorTag({text, title=''}) {
    return <span className='tag bg-danger text-nowrap' title={title}>{text}</span>;
}

function FirmwareVersionWithLabels({version, availableFw, extSupport}) {
    const { t } = useTranslation();
    return (
        <>
        {version}
        {version && availableFw && <WarningTag text={t('device-manager.labels.available', {version: availableFw})}/>}
        {version && extSupport && <span className="glyphicon glyphicon-flash" title={t('device-manager.labels.extended-modbus')}></span>}
        </>
    );
}

export { WarningTag, ErrorTag, FirmwareVersionWithLabels };
