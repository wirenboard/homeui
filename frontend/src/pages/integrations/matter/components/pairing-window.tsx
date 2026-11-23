import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { pairingQrUrl } from '@/stores/matter';
import type { PairingWindowProps } from '../types';
import { groupManualCode } from '../utils';
import { CopyField } from './copy-field';

/**
 * The pairing window, drawn under the list of fabrics: the place a new fabric comes from
 * sits right below the ones that are already there.
 *
 * The bridge comes up with the window closed, so this block has three faces: an
 * invitation while nothing is paired, a quiet line with the same button once something
 * is, and the code while the window is open. Pairing starts when a person asks for it and
 * never on its own - see R15 in docs/design-config-and-pairing.md of
 * wb-mqtt-matter-bridge.
 */
export const PairingWindow = ({
  pairing, isEmpty, left, isChanging, hasFailed, onOpen, onClose, onNewCode,
}: PairingWindowProps) => {
  const { t } = useTranslation();

  const failure = hasFailed && (
    <Alert variant="danger" size="small">
      {t('matter.labels.window-failed')}
    </Alert>
  );

  if (!pairing) {
    return (
      <div className="matter-window">
        <Alert className="alert-withButton" variant={isEmpty ? 'info' : 'gray'} withIcon={false}>
          <span>{t(isEmpty ? 'matter.labels.window-closed' : 'matter.labels.window-closed-paired')}</span>
          <Button
            variant="primary"
            label={t('matter.buttons.open-window')}
            isLoading={isChanging}
            disabled={isChanging}
            onClick={onOpen}
          />
          {/* Only here, with the window closed: the bridge refuses to change the code
              under an open window, which runs on the code it was opened with. Offering
              the button there would be offering a refusal. */}
          <Button
            size="small"
            variant="secondary"
            label={t('matter.buttons.new-code')}
            disabled={isChanging}
            onClick={onNewCode}
          />
        </Alert>
        {failure}
      </div>
    );
  }

  return (
    <div className="matter-window">
      {/* Not a live region while it is open: the countdown changes every second, and an
          alert would have a screen reader say every one of them. */}
      <Alert variant="info" withIcon={false} role="group" aria-live="off">
        <div className="matter-windowHead">
          <strong>{t('matter.labels.window-left', { left })}</strong>
          <Button
            size="small"
            variant="secondary"
            label={t('matter.buttons.close-window')}
            isLoading={isChanging}
            disabled={isChanging}
            onClick={onClose}
          />
        </div>

        <div className="matter-pairing">
          <div className="matter-qr">
            <img
              className="matter-qrImage"
              src={pairingQrUrl(pairing.qr_version)}
              alt={t('matter.labels.qr-alt')}
            />
          </div>

          <div className="matter-pairingBody">
            <ol className="matter-steps">
              <li>{t('matter.labels.step-app')}</li>
              <li>{t('matter.labels.step-add')}</li>
              <li>{t('matter.labels.step-scan')}</li>
            </ol>

            <div className="matter-fields">
              <CopyField
                label={t('matter.labels.manual-code')}
                text={groupManualCode(pairing.manual_code)}
                value={pairing.manual_code}
              />
              <CopyField
                label={t('matter.labels.payload')}
                text={pairing.payload}
                value={pairing.payload}
              />
            </div>
          </div>
        </div>
      </Alert>
      {failure}
    </div>
  );
};
