import classNames from 'classnames';
import { type KeyboardEvent, useRef, useState } from 'react';
import SearchIcon from '@/assets/icons/search.svg';
import { Input } from '@/components/input';
import { type SearchBarProps } from './types';
import './styles.css';

export const SearchBar = ({ value, placeholder, ariaLabel, onChange }: SearchBarProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isExpanded = isFocused || !!value;

  const handleWrapperKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onChange('');
      inputRef.current?.blur();
    }
  };

  return (
    <div
      className={classNames('searchBar', { 'searchBar-expanded': isExpanded })}
      onKeyDown={handleWrapperKeyDown}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    >
      {!value && <SearchIcon className="searchBar-icon" />}
      <Input
        ref={inputRef}
        type="search"
        value={value}
        className={classNames('searchBar-input', { 'searchBar-input-has-value': !!value })}
        placeholder={isExpanded ? placeholder : ''}
        ariaLabel={ariaLabel ?? placeholder}
        onChange={(val) => onChange(String(val))}
      />
    </div>
  );
};
