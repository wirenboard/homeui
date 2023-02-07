import React, { useState } from 'react';

export function TabList({ className, children }) {
  return <ul className={className} oops="col-md-2 nav nav-pills nav-stacked">{children}</ul>;
}

export function TabItem({ id, active, onClick, children }) {
  return (
    <li role="presentation" className={active ? ' active' : undefined}>
      <a href={'#' + id} aria-controls={id} role="tab" onClick={onClick}>
        {children}
      </a>
    </li>
  );
}

export function TabPane({ id, active, children }) {
  return (
    <div id={id} className={active ? 'tab-pane active' : 'tab-pane'} role="tabpanel">
      {children}
    </div>
  );
}

export function TabContent({ className, children }) {
  return <div className={ "tab-content " + className }>{children}</div>;
}

export function Tabs({ children }) {
  return <div>{children}</div>;
}

export function TabsBuilder({tabs, contents, bottomOfTheList, tabContentClasses, tabListClasses}) {
  const [ currentIndex, setCurrentIndex ] = useState(0);

  const tabsList = tabs.map(({ children, ...props }, index) => {
    const onClick = (e) => {
      console.log("Hey ", index);
      e.preventDefault();
      props.onClick?.(e);
      setCurrentIndex(index);
    };

    return (
      <TabItem active={index === currentIndex} key={props.id} id={props.id} onClick={onClick}>{children}</TabItem>
    );
  });

  const tabsContents = contents.map(({ children, ...props }, index) => {
    const active = () => (currentIndex === index);
    return <TabPane key={props.id} id={props.id} active={active()}>{children}</TabPane>
  });

  return (
    <Tabs>
      <TabList className={tabListClasses}>{tabsList}{bottomOfTheList}</TabList>
      <TabContent className={tabContentClasses}>{tabsContents}</TabContent>
    </Tabs>
  );
}

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
