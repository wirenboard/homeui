import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import { InfoIconButton } from '@/components/info-icon-button';
import { Popup } from '@/components/popup';
import { MatterAdviceActionKind } from '@/stores/matter';
import type { FabricAdviceProps } from '../types';
import { said } from '../utils';

const KNOWN_ACTIONS: string[] = Object.values(MatterAdviceActionKind);

/**
 * What to do about one line of a fabric, behind a small button at the end of that line:
 * the line itself stays what it is with or without an advice.
 *
 * The words - of the advice, of its button - are the bridge's, in both languages, so that
 * an advice about the habits of one app is changed by a release of the bridge alone. This
 * page knows only what an action does; an advice with an action it does not know is
 * printed as words.
 */
export const FabricAdvice = ({ advice, onAct }: FabricAdviceProps) => {
  const { t, i18n } = useTranslation();
  const [isOpen, setOpen] = useState(false);

  return (
    <Popup
      isOpen={isOpen}
      content={(
        <div className="matter-advice">
          {advice.map((one) => (
            <div className="matter-advice" key={one.code}>
              <p className="matter-adviceText">{said(one.text, i18n.language)}</p>
              {onAct && one.action && KNOWN_ACTIONS.includes(one.action.kind) && (
                <Button
                  size="small"
                  variant="secondary"
                  label={said(one.action.label, i18n.language)}
                  onClick={() => {
                    setOpen(false);
                    onAct(one);
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}
      onOpenChange={setOpen}
    >
      <InfoIconButton aria-label={t('matter.buttons.advice')} />
    </Popup>
  );
};
