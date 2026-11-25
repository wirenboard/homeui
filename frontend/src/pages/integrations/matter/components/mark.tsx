import BanIcon from '@/assets/icons/ban.svg';
import SuccessIcon from '@/assets/icons/success.svg';
import WarnIcon from '@/assets/icons/warn.svg';
import type { MarkProps } from '../types';

const ICONS = { ok: SuccessIcon, error: WarnIcon, off: BanIcon };

/**
 * The sign of an outcome, the same wherever the page says one: passed, something to fix,
 * not passed. An app that cannot be asked has no icon, only an empty ring.
 *
 * Hidden from a screen reader: the words beside the sign always say the same.
 */
export const Mark = ({ status }: MarkProps) => {
  const Icon = ICONS[status];
  return Icon
    ? <Icon className={`matter-mark matter-mark-${status}`} aria-hidden="true" />
    : <span className="matter-mark matter-mark-unknown" aria-hidden="true" />;
};
