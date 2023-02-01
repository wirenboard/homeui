import React from 'react';
import { useTranslation } from 'react-i18next';

function WarningTag({text}) {
    return <span className='tag bg-warning text-nowrap'>{text}</span>;
}

function ErrorTag({text}) {
    return <span className='tag bg-danger text-nowrap'>{text}</span>;
}

function FirmwareVersionWithLabels({version, availableFw, extSupport}) {
    const { t } = useTranslation();
    return (
        <>
        {version}
        {availableFw && <WarningTag text={t('device-manager.labels.available', {version: availableFw})}/>}
        {extSupport && <span class="glyphicon glyphicon-flash"></span>}
        </>
    );
}

export { WarningTag, ErrorTag, FirmwareVersionWithLabels };
