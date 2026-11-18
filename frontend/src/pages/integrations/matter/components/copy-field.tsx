import { useTranslation } from 'react-i18next';
import CopyIcon from '@/assets/icons/copy.svg';
import { Button } from '@/components/button';
import { Tooltip } from '@/components/tooltip';
import { copyToClipboard } from '@/utils/clipboard';
import type { CopyFieldProps } from '../types';

export const CopyField = ({ label, text, value }: CopyFieldProps) => {
  const { t } = useTranslation();

  return (
    <div className="matter-field">
      <span className="matter-fieldLabel">{label}</span>
      <div className="matter-fieldValue">
        <code className="matter-fieldText">{text}</code>
        {/* The click opens the tooltip, so it reports the copy instead of labelling the button. */}
        <Tooltip text={t('matter.labels.copied')} trigger="click" placement="top">
          <Button
            size="small"
            variant="secondary"
            icon={<CopyIcon />}
            aria-label={`${t('matter.buttons.copy')}: ${label}`}
            onClick={() => copyToClipboard(value)}
          />
        </Tooltip>
      </div>
    </div>
  );
};
