interface Option {
  label: string;
  value: string | boolean | number | null;
}

export interface DropdownProps {
  className?: string;
  options: Option[];
  value: string | number;
  placeholder?: string;
  onChange: (_val: Option) => void;
  size?: 'default' | 'small';
  ariaLabel?: string;
}
