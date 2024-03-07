import React, { useContext, createContext } from 'react';
import { observer } from 'mobx-react-lite';
import { Tabs, TabList, TabPanel, Tab } from 'react-tabs';

const TabsOrientationContext = createContext('horizontal');

export const TabsList = ({ children, className, ...otherProps }) => {
  const classes =
    useContext(TabsOrientationContext) === 'horizontal'
      ? 'nav nav-tabs'
      : 'nav nav-pills nav-stacked';
  return (
    <TabList className={className ? classes + ' ' + className : classes} {...otherProps}>
      {children}
    </TabList>
  );
};
TabsList.tabsRole = 'TabList';

export const TabItem = observer(({ children, className, ...otherProps }) => {
  return (
    <Tab tabIndex={'0'} className={className} selectedClassName={'active'} {...otherProps}>
      {children}
    </Tab>
  );
});
TabItem.tabsRole = 'Tab';

export const TabPane = observer(({ children, ...otherProps }) => {
  return (
    <TabPanel selectedClassName={'active'} className={'tab-pane'} {...otherProps}>
      {children}
    </TabPanel>
  );
});
TabPane.tabsRole = 'TabPanel';

export const TabContent = ({ className, children, ...otherProps }) => {
  const classes =
    useContext(TabsOrientationContext) === 'horizontal'
      ? 'tab-content'
      : 'tab-content well well-small';
  return (
    <div className={className ? classes + ' ' + className : classes} {...otherProps}>
      {children}
    </div>
  );
};

export const VerticalTabs = ({ selectedIndex, onSelect, className, children }) => {
  return (
    <TabsOrientationContext.Provider value={'vertical'}>
      <Tabs selectedIndex={selectedIndex} onSelect={onSelect} className={className}>
        {children}
      </Tabs>
    </TabsOrientationContext.Provider>
  );
};

export const HorizontalTabs = observer(({ selectedIndex, onSelect, children }) => {
  return (
    <div>
      <TabsOrientationContext.Provider value={'horizontal'}>
        <Tabs selectedIndex={selectedIndex} onSelect={onSelect}>
          {children}
        </Tabs>
      </TabsOrientationContext.Provider>
    </div>
  );
});
