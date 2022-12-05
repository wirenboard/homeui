import React from 'react';

function WarningBox({text}) {
    return <span className='tag bg-warning'>{text}</span>;
}

function ErrorBox({text}) {
    return <span className='tag bg-danger'>{text}</span>;
}

export { WarningBox, ErrorBox };
