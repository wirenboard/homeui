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
      tabIndex={activeTab === id ? 0 : -1}
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
    if (nextId === undefined) {
      return;
    }

    onTabChange(nextId);
    requestAnimationFrame(() => {
      focusTab(index);
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const currentIndex = tabIds.findIndex((id) => id === activeTab);

    if (currentIndex === -1) return;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        activateTabAt((currentIndex + 1) % tabIds.length);
        break;

      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        activateTabAt((currentIndex - 1 + tabIds.length) % tabIds.length);
        break;

      case 'Home':
        event.preventDefault();
        activateTabAt(0);
        break;

      case 'End':
        event.preventDefault();
        activateTabAt(tabIds.length - 1);
        break;

      case 'Enter':
      case ' ': {
        event.preventDefault();
        const nextId = tabIds[currentIndex];
        onTabChange(nextId);

        requestAnimationFrame(() => {
          const tabList = (event.target as any).closest('[role="tablist"]');
          if (!tabList) return;

          const currentTabId = tabIds[currentIndex];

          requestAnimationFrame(() => {
            const panel = document.getElementById(currentTabId);
            panel?.focus();
          });
        });

        break;
      }
    }
  };

  tabRefs.current = tabRefs.current.slice(0, tabIds.length);

  return (
    <ul
      className={classNames('tabs', className, {
        'tabs-vertical': !orientation || orientation === 'vertical',
        'tabs-horizontal': orientation === 'horizontal',
      })}
      aria-orientation={orientation === 'vertical' ? 'vertical' : 'horizontal'}
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
          onKeyDown={handleKeyDown}
        >
          {item.label}
        </Tab>
      ))}
    </ul>
  );
};

export const TabContent = ({ tabId, activeTab, children, className }: PropsWithChildren<TabContentProps>) => {
  return activeTab === tabId
    ? (
      <div
        role="tabpanel"
        id={tabId}
        tabIndex={0}
        className={classNames(className)}
      >{children}
      </div>
    )
    : null;
};
