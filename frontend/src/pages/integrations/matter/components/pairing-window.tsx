import { useTranslation } from 'react-i18next';
import PlusIcon from '@/assets/icons/plus.svg';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { pairingQrUrl } from '@/stores/matter';
import type { PairingWindowProps } from '../types';
import { groupManualCode } from '../utils';
import { CopyField } from './copy-field';

/**
 * How a fabric is added, drawn under the list of fabrics.
 *
 * One place for the whole of it: the button, the code that comes after it and the way to
 * call it off all stand where the next fabric will appear, so nobody has to look for what
 * their click did. The bridge comes up not pairable and becomes so only when a person
 * asks - see R15 in docs/design-config-and-pairing.md of wb-mqtt-matter-bridge - which is
 * why there is a button at all.
 *
 * Flat on purpose: a line above and the card's own background. A coloured block here was
 * a box inside a box, and it set a second and a third left edge beside the list's.
 */
export const PairingWindow = ({
  pairing, isEmpty, devicesCount, left, isChanging, hasFailed, hasExpired, isOffline, onOpen, onClose,
}: PairingWindowProps) => {
  const { t } = useTranslation();

  const failure = hasFailed && (
    <Alert variant="danger" size="small">{t('matter.labels.window-failed')}</Alert>
  );

  if (pairing) {
    return (
      <div className="matter-window">
        <div className="matter-newFabric">
          <span className="matter-newFabricTitle">{t('matter.labels.new-fabric')}</span>
          {/* The three things a person looks for while waiting stand together, where the
              button that started the wait stood: that it waits, for how long, how to stop. */}
          <div className="matter-waitingTrio">
            <span className="matter-waiting">{t('matter.labels.window-waiting')}</span>
            <span className="matter-waitingLeft">{t('matter.labels.window-left', { left })}</span>
            <Button
              variant="secondary"
              label={t('matter.buttons.close-window')}
              isLoading={isChanging}
              disabled={isChanging}
              onClick={onClose}
            />
          </div>
        </div>

        {/* The payload is not shown: it is what the picture encodes, and no app a person
            uses takes it as text. A tool that does reads it from the journal of the
            bridge at the debug level. */}
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
              <li>{t('matter.labels.step-add')}</li>
              <li>{t('matter.labels.step-scan')}</li>
            </ol>

            <CopyField
              label={t('matter.labels.manual-code')}
              text={groupManualCode(pairing.manual_code)}
              value={pairing.manual_code}
            />
          </div>
        </div>
        {failure}
      </div>
    );
  }

  // What the line beside the button says. The reasons the button will not help come
  // first: a person told only what a fabric is would press it and learn nothing.
  let note = isEmpty
    ? t('matter.labels.window-closed', { count: devicesCount })
    : t('matter.labels.window-closed-paired');
  if (hasExpired) {
    note = t('matter.labels.window-expired');
  }
  if (isOffline) {
    note = t('matter.labels.window-offline');
  }

  return (
    <div className="matter-window">
      {/* The title of the section is a label, set like the headings of the columns: in
          the type of a fabric's name it read as one more fabric, and in the type of the
          card's title as a second title. The invitation of an empty bridge is set the
          same way, so the section looks one way whatever the list holds. */}
      <div className="matter-newFabric">
        <span className="matter-newFabricText">
          {/* An empty list is not said twice: the invitation is what it has to say. */}
          <span className="matter-newFabricTitle">
            {t(isEmpty ? 'matter.labels.fabrics-empty' : 'matter.labels.new-fabric')}
          </span>
          <span className="matter-newFabricNote">{note}</span>
          {isEmpty && devicesCount === 0 && !hasExpired && !isOffline && (
            <span className="matter-newFabricNote">{t('matter.labels.window-no-devices')}</span>
          )}
        </span>
        <Button
          variant="primary"
          icon={<PlusIcon />}
          label={t('matter.buttons.open-window')}
          isLoading={isChanging}
          disabled={isChanging || isOffline}
          onClick={onOpen}
        />
      </div>
      {failure}
    </div>
  );
};
