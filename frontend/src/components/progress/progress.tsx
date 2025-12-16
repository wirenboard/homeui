import { type ProgressProps } from './types';
import './styles.css';

export const Progress = ({ value, caption }: ProgressProps) => (
  <div className="wb-progress">
    <progress className="wb-progress-bar" value={value} max={100} />
    <span className="wb-progress-caption">{caption}</span>
  </div>
);
