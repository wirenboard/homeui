import classNames from 'classnames';
import { type PropsWithChildren } from 'react';
import { type TagProps } from './types';
import './styles.css';

export const Tag = ({
  children,
  className,
  variant = 'primary',
  ...rest
}: PropsWithChildren<TagProps>) => (
  <div
    className={classNames('tag', className, {
      'tag-primary': variant === 'primary',
      'tag-success': variant === 'success',
      'tag-warn': variant === 'warn',
      'tag-danger': variant === 'danger',
      'tag-gray': variant === 'gray',
    })}
    {...rest}
  >
    {children}
  </div>
);
