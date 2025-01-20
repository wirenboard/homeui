import { GroupBase, OptionsOrGroups } from 'react-select';

export type DropdownOptions = OptionsOrGroups<string | number, GroupBase<string | number>>;

export interface DropdownProps {
  className?: string;
  options: DropdownOptions;
  value: string | number;
  placeholder?: string;
  onChange: (_val: any) => void;
  size?: 'default' | 'small';
  ariaLabel?: string;
}
