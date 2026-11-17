import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Confirm } from '@/components/confirm';
import { Input } from '@/components/input';
import { matterStore } from '@/stores/matter';
import type { FabricLabelDialogProps } from '../types';

/**
 * Matter's own limit on a fabric label, which the one typed here stands in for.
 * Nothing forces the page to keep to it, but a label that could never be written as a
 * fabric label would be a trap the day a way to write one appears. The bridge refuses
 * longer ones; this stops them being typed at all.
 */
const FABRIC_LABEL_MAX_LENGTH = 32;

/**
 * Gives one fabric a label that is kept on this controller.
 *
 * The label never reaches the app, and the dialog says so, because an operator may well
 * expect it to turn up there: UpdateFabricLabel is fabric-scoped, so only the
 * administrator of a fabric may write its label and a bridge cannot.
 */
export const FabricLabelDialog = observer(({ fabric, onClose }: FabricLabelDialogProps) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');

  // Seeded when the dialog opens on a fabric, and left alone afterwards. A poll of the
  // store arriving mid-edit does not reach this: `fabric` is the snapshot the page held
  // when the menu was used, so its reference does not change while the dialog is open.
  useEffect(() => {
    if (fabric) {
      // From the label on screen and not from the local one alone: labelling a fabric
      // that came with a label of its own starts from that label, which is what is
      // being looked at.
      setDraft(fabric.localFabricLabel ?? fabric.adminFabricLabel ?? '');
    }
  }, [fabric]);

  return (
    <Confirm
      isOpened={fabric !== null}
      heading={t('matter.labels.fabric-label-heading')}
      acceptLabel={t('matter.buttons.fabric-label-save')}
      cancelLabel={t('matter.buttons.fabric-label-cancel')}
      isLoading={matterStore.labellingIndex !== null}
      closeCallback={onClose}
      confirmCallback={async () => {
        if (fabric && await matterStore.setLocalFabricLabel(fabric.index, draft)) {
          onClose();
        }
      }}
    >
      <Input
        value={draft}
        ariaLabel={t('matter.labels.fabric-label-field')}
        placeholder={t('matter.labels.fabric-label-placeholder')}
        autoFocus
        isFullWidth
        // Cut here as well as refused by the bridge: a label that was silently too long
        // would come back as a failed save with nothing on screen to point at.
        onChange={(value) => setDraft(String(value).slice(0, FABRIC_LABEL_MAX_LENGTH))}
      />
      <p className="matter-dialogText">{t('matter.labels.fabric-label-local')}</p>
      <p className="matter-dialogText">{t('matter.labels.fabric-label-empty')}</p>
      {matterStore.hasLabelFailed && (
        <p className="matter-dialogText matter-dialogError">{t('matter.labels.fabric-label-failed')}</p>
      )}
    </Confirm>
  );
});
