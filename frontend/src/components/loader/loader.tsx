import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import LoaderIcon from '@/assets/icons/spinner.svg';
import { type LoaderProps } from './types';
import './styles.css';

export const Loader = ({ className, caption, size = 'default' }: LoaderProps) => {
  const { t } = useTranslation();

  return (
    <div className="loader-container">
      <LoaderIcon
        className={classNames('loader', className, {
          'loader-iconSmall': size === 'small',
          'loader-iconDefault': size === 'default',
        })}
        role="status"
        aria-live="polite"
        aria-label={t('common.labels.loading')}
      />
      {!!caption && <span>{caption}</span>}
    </div>
  );
};
