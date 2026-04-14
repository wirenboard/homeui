import { type ReactElement } from 'react';

export interface TabItem {
  id: any;
  label: string | ReactElement<any, string>;
}

export interface TabsProps {
  className?: string;
  items: TabItem[];
  activeTab: any;
  orientation?: 'horizontal' | 'vertical';
  onTabChange: (id: any) => void;
}

export interface TabContentProps {
  tabId: any;
  className?: string;
  activeTab: any;
}

export interface UseTabsArgs {
  items: TabItem[];
  defaultTab?: any;
  onBeforeTabChange?: (next: any, current: any) => boolean | Promise<boolean>;
  onAfterTabChange?: (next: any, prev: any) => void;
}

export interface TabListProps {
  className?: string;
  activeTab: any;
  onTabChange: (_id: any) => void;
}

export interface TabProps {
  id: any;
  activeTab?: any;
  onTabChange?: (_id: any) => void;
}
