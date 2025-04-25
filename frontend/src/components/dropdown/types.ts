export interface Option {
  label: string;
  value: string | boolean | number | null;
}

export interface DropdownProps {
  className?: string;
  options: Option[];
  value: string | number;
  placeholder?: string;
  multiselect?: boolean;
  isLoading?: boolean;
  isSearchable?: boolean;
  isClearable?: boolean;
  isDisabled?: boolean;
  onChange: (_val: Option | Option[]) => void;
  size?: 'default' | 'small';
  ariaLabel?: string;
}
