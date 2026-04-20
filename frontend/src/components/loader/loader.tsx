import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import LoaderIcon from '@/assets/icons/spinner.svg';
import './styles.css';

export const Loader = ({ className, caption }: { className?: string; caption?: string }) => {
  const { t } = useTranslation();

  return (
    <div className="loader-container">
      <LoaderIcon
        className={classNames('loader', className)}
        role="status"
        aria-live="polite"
        aria-label={t('common.labels.loading')}
      />
      {!!caption && <span>{caption}</span>}
    </div>
  );
};
