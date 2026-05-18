import { Loader } from '@/components/loader';
import { Progress } from '@/components/progress';
import { type LoadingOptions } from '../../types';
import './styles.css';

export const PageLoader = ({ options }: { options: LoadingOptions }) => (
  !options || options?.loader === 'spinner'
    ? <Loader className="page-loader" />
    : <Progress caption={options.label} value={options.progress} />
);
