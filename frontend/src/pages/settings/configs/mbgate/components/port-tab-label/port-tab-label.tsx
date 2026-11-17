import WarnIcon from '@/assets/icons/warn.svg';
import { type PortBinding } from '@/pages/settings/configs/mbgate/stores/page-store';

interface PortTabLabelProps {
  name: string;
  binding?: PortBinding;
  hasConflict: boolean;
}

function formatPortBinding(binding?: PortBinding) {
  if (!binding) {
    return '';
  }
  if (binding.isRtu) {
    return `RTU ${binding.path ?? ''}`;
  }
  return `TCP ${binding.host ?? ''}:${binding.port ?? ''}`;
}

export const PortTabLabel = ({ name, binding, hasConflict }: PortTabLabelProps) => (
  <div className="mbgate-portTab">
    <div className="mbgate-portTabText">
      <span className="mbgate-portTabName">{name}</span>
      <span className="mbgate-portTabDetails">{formatPortBinding(binding)}</span>
    </div>
    {hasConflict && <WarnIcon className="mbgate-portTabWarn" />}
  </div>
);
