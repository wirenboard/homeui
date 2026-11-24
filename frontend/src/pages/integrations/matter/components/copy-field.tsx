import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CheckIcon from '@/assets/icons/check.svg';
import CopyIcon from '@/assets/icons/copy.svg';
import { Button } from '@/components/button';
import { copyToClipboard } from '@/utils/clipboard';
import type { CopyFieldProps } from '../types';

// How long the button says the copy was made before it offers to copy again.
const COPIED_MS = 2000;

/**
 * A value to copy. Both the value and the button beside it copy: a person reaches for
 * the code itself as often as for the button, and a click on it used to do nothing.
 */
export const CopyField = ({ label, text, value }: CopyFieldProps) => {
  const { t } = useTranslation();
  const [isCopied, setCopied] = useState(false);

  useEffect(() => {
    if (!isCopied) {
      return undefined;
    }
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [isCopied]);

  const copy = () => {
    copyToClipboard(value);
    setCopied(true);
  };

  return (
    <div className="matter-field">
      <span className="matter-fieldLabel">{label}</span>
      <div className="matter-fieldValue">
        <button type="button" className="matter-fieldText" onClick={copy}>{text}</button>
        <Button
          variant="secondary"
          icon={isCopied ? <CheckIcon /> : <CopyIcon />}
          label={t(isCopied ? 'matter.buttons.copied' : 'matter.buttons.copy')}
          aria-label={`${t('matter.buttons.copy')}: ${label}`}
          onClick={copy}
        />
        {/* The button changes for the eye; this says the same to a screen reader. */}
        <span className="matter-srOnly" role="status">{isCopied ? t('matter.labels.copied') : ''}</span>
      </div>
    </div>
  );
};
