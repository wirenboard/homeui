import React, { useContext, createContext } from 'react';
import { observer } from 'mobx-react-lite';
import { Tabs, TabList, TabPanel, Tab } from 'react-tabs';

const TabsOrientationContext = createContext('horizontal');

export const TabsList = ({ children, ...otherProps }) => {
  const classes =
    useContext(TabsOrientationContext) === 'horizontal'
      ? 'nav nav-tabs'
      : 'col-sm-4 col-md-3 col-lg-2 nav nav-pills nav-stacked';
  return (
    <TabList className={classes} {...otherProps}>
      {children}
    </TabList>
  );
};
TabsList.tabsRole = 'TabList';

export const TabItem = observer(({ children, ...otherProps }) => {
  return (
    <Tab className={''} selectedClassName={'active'} {...otherProps}>
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

export const TabContent = ({ children, ...otherProps }) => {
  const classes =
    useContext(TabsOrientationContext) === 'horizontal'
      ? 'tab-content'
      : 'col-sm-8 col-md-9 col-lg-10 tab-content well well-small';
  return (
    <div className={classes} {...otherProps}>
      {children}
    </div>
  );
};

export const VerticalTabs = ({ selectedIndex, onSelect, children }) => {
  return (
    <div>
      <TabsOrientationContext.Provider value={'vertical'}>
        <Tabs selectedIndex={selectedIndex} onSelect={onSelect}>
          {children}
        </Tabs>
      </TabsOrientationContext.Provider>
    </div>
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
