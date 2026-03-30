import classNames from 'classnames';
import {
  Children,
  cloneElement,
  isValidElement,
  type KeyboardEvent,
  type PropsWithChildren,
  useRef,
} from 'react';
import type { TabContentProps, TabListProps, TabProps, TabsProps } from './types';
import './styles.css';

export const TabList = ({ className, children, activeTab, onTabChange }: PropsWithChildren<TabListProps>) => (
  <ul className={classNames('tabs', className)} role="tablist">{
    Children.map(children, (child) => {
      if (isValidElement(child)) {
        return cloneElement(child as any, {
          activeTab,
          onTabChange,
        });
      }
      return child;
    })
  }
  </ul>
);

export const Tab = ({
  children,
  id,
  activeTab,
  onTabChange,
  onKeyDown,
  buttonRef,
}: PropsWithChildren<TabProps>) => (
  <li
    className={classNames({
      'tabs-buttonSelected': activeTab === id,
    })}
  >
    <button
      type="button"
      role="tab"
      aria-selected={activeTab === id}
      className="tabs-button"
      aria-controls={id}
      tabIndex={activeTab === id ? null : -1}
      ref={buttonRef}
      onKeyDown={onKeyDown}
      onClick={() => onTabChange(id)}
    >
      {children}
    </button>
  </li>
);

export const Tabs = ({ className, items, orientation, activeTab, onTabChange }: TabsProps) => {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabIds = items.map((item) => item.id);

  const focusTab = (index: number) => {
    const nextTab = tabRefs.current[index];
    nextTab?.focus();
  };

  const activateTabAt = (index: number) => {
    const nextId = tabIds[index];
    if (!nextId) {
      return;
    }

    onTabChange(nextId);
    focusTab(index);
  };

  const handleKeyDown = (index: number) => (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!tabIds.length) {
      return;
    }

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        activateTabAt((index + 1) % tabIds.length);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        activateTabAt((index - 1 + tabIds.length) % tabIds.length);
        break;
      case 'Home':
        event.preventDefault();
        activateTabAt(0);
        break;
      case 'End':
        event.preventDefault();
        activateTabAt(tabIds.length - 1);
        break;
    }
  };

  tabRefs.current = tabRefs.current.slice(0, tabIds.length);

  return (
    <ul
      className={classNames('tabs', className, {
        'tabs-vertical': !orientation || orientation === 'vertical',
        'tabs-horizontal': orientation === 'horizontal',
      })}
      role="tablist"
    >
      {items.map((item, index) => (
        <Tab
          key={item.id}
          activeTab={activeTab}
          id={item.id}
          buttonRef={(node) => {
            tabRefs.current[index] = node;
          }}
          onTabChange={onTabChange}
          onKeyDown={handleKeyDown(index)}
        >
          {item.label}
        </Tab>
      ))}
    </ul>
  )
};

export const TabContent = ({ tabId, activeTab, children, className }: PropsWithChildren<TabContentProps>) => {
  return activeTab === tabId ? <div role="tabpanel" className={classNames(className)}>{children}</div> : null;
};
