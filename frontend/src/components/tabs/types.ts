import { type ReactElement } from 'react';

export interface TabItem {
  id: string;
  label: string | ReactElement<any, string>;
}

export interface TabsProps {
  className?: string;
  items: TabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

export interface TabContentProps {
  tabId: string;
  className?: string;
  activeTab: string;
}

export interface UseTabsArgs {
  items: TabItem[];
  defaultTab?: string;
  onBeforeTabChange?: (next: string, current: string) => boolean | Promise<boolean>;
  onAfterTabChange?: (next: string, prev: string) => void;
}

export interface TabListProps {
  className?: string;
  activeTab: string;
  onTabChange: (_id: string) => void;
}

export interface TabProps {
  id: string;
  activeTab?: string;
  onTabChange?: (_id: string) => void;
}
