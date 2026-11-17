export interface SearchBarProps {
  value: string;
  placeholder?: string;
  ariaLabel?: string;
  onChange: (value: string) => void;
}
