import classNames from 'classnames';
import LoaderIcon from '@/assets/icons/spinner.svg';
import './styles.css';

export const Loader = ({ className }: { className?: string }) => (
  <LoaderIcon className={classNames('loader', className)} role="status" />
);
