import React from 'react';

export const TabList = ({ children }) => {
  return <ul className="col-md-2 nav nav-pills nav-stacked">{children}</ul>;
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
  return <div className="col-md-10 tab-content well well-small">{children}</div>;
};

export const Tabs = ({ children }) => {
  return <div>{children}</div>;
};

export const EditorTabItem = ({ id, active, onClick, children }) => {
  return (
    <li role="presentation" className={active ? 'active' : undefined}>
      <a href={'#' + id} aria-controls={id} role="tab" onClick={onClick}>
        {children}
      </a>
    </li>
  );
};

export const EditorTabPane = ({ id, active, children }) => {
  return <TabPane id={id} active={active}>{children}</TabPane>;  // FIXME
};

export const EditorTabList = ({ children }) => {
  return <ul className="nav nav-tabs" role="tablist">{children}</ul>;
};

export const EditorTabContent = ({ children }) => {
  return <div className="tab-content">{children}</div>;
}
