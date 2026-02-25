import classNames from 'classnames';
import LoaderIcon from '@/assets/icons/spinner.svg';
import './styles.css';

export const Loader = ({ className, caption }: { className?: string; caption?: string }) => (
  <div className="loader-container">
    <LoaderIcon className={classNames('loader', className)} role="status" />
    {!!caption && <span>{caption}</span>}
  </div>
);
