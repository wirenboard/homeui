import classNames from 'classnames';
import { PropsWithChildren, cloneElement, Children, isValidElement, ReactElement } from 'react';
import { TabContentProps, TabListProps, TabProps, TabsProps } from './types';
import './styles.css';

export const TabList = ({ className, children, activeTab, onTabChange }: PropsWithChildren<TabListProps>) => (
  <ul className={classNames('tabs', className)}>{
    Children.map(children, (child) => {
      if (isValidElement(child)) {
        return cloneElement(child as ReactElement, {
          activeTab,
          onTabChange,
        });
      }
      return child;
    })
  }
  </ul>
);

export const Tab = ({ children, id, activeTab, onTabChange }: PropsWithChildren<TabProps>) => (
  <li>
    <button
      type="button"
      role="tab"
      className={classNames('tabs-button', {
        'tabs-buttonSelected': activeTab === id,
      })}
      onClick={() => onTabChange(id)}
    >
      {children}
    </button>
  </li>
);

export const Tabs = ({ className, items, activeTab, onTabChange }: TabsProps) => (
  <ul className={classNames('tabs', className)} role="tablist">
    {items.map((item) => (
      <Tab key={item.id} activeTab={activeTab} id={item.id} onTabChange={onTabChange}>
        {item.label}
      </Tab>
    ))}
  </ul>
);

export const TabContent = ({ tabId, activeTab, children, className }: PropsWithChildren<TabContentProps>) => {
  return activeTab === tabId ? <div role="tabpanel" className={classNames(className)}>{children}</div> : null;
};
