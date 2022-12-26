import React from 'react';

function WarningTag({text}) {
    return <span className='tag bg-warning text-nowrap'>{text}</span>;
}

function ErrorTag({text}) {
    return <span className='tag bg-danger text-nowrap'>{text}</span>;
}

export { WarningTag, ErrorTag };
