'use strict';

import React from 'react';
import { observer } from 'mobx-react-lite';
import AccessLevelErrorBanner from '../access-level/accessLevel';
import { ErrorBar, Spinner } from '../../common';

export const PageWrapper = observer(({ error, className, accessLevelStore, children }) => {
  return (
    <div className={className}>
      <AccessLevelErrorBanner store={accessLevelStore}>
        <ErrorBar msg={error}></ErrorBar>
        {children}
      </AccessLevelErrorBanner>
    </div>
  );
});

export const PageTitle = ({ title, children }) => {
  return (
    <h1 className="page-header">
      {title && <span>{title}</span>}
      {children}
    </h1>
  );
};

export const PageBody = observer(({ loading, children, renderChildren }) => {
  if (renderChildren) {
    return (
      <>
        {loading && <Spinner />}
        <>{children}</>
      </>
    );
  }
  return <>{loading ? <Spinner /> : <>{children}</>}</>;
});
