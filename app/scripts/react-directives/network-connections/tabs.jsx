import React from 'react';

export const TabList = ({ children }) => {
  return <ul className="col-sm-4 col-lg-2 nav nav-pills nav-stacked">{children}</ul>;
};

export const TabItem = ({ id, active, onClick, children }) => {
  return (
    <li role="presentation" className={active ? ' active' : undefined}>
      <a href={'#' + id} aria-controls={id} role="tab" onClick={onClick}>
        {children}
      </a>
    </li>
  );
};

export const TabPane = ({ id, active, children }) => {
  return (
    <div id={id} className={active ? 'tab-pane active' : 'tab-pane'} role="tabpanel">
      {children}
    </div>
  );
};

export const TabContent = ({ children }) => {
  return <div className="col-sm-8 col-lg-10 tab-content well well-small">{children}</div>;
};

export const Tabs = ({ children }) => {
  return <div>{children}</div>;
};
