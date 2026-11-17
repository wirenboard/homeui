import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Confirm } from '@/components/confirm';
import { Input } from '@/components/input';
import { matterStore } from '@/stores/matter';
import type { RenameDialogProps } from '../types';

/**
 * Matter's own limit on a fabric label, which the name typed here stands in for.
 * Nothing forces the page to keep to it, but a name that could never be written as a
 * label would be a trap the day a way to write one appears. The bridge refuses longer
 * ones; this stops them being typed at all.
 */
const APP_NAME_MAX_LENGTH = 32;

/**
 * Gives one app a name that is kept on this controller.
 *
 * The name never reaches the app, and the dialog says so, because an operator may well
 * expect it to turn up there: UpdateFabricLabel is fabric-scoped, so only the
 * administrator of a fabric may write its label and a bridge cannot.
 */
export const RenameDialog = observer(({ fabric, onClose }: RenameDialogProps) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');

  // Seeded when the dialog opens on an app, and left alone afterwards. A poll of the
  // store arriving mid-edit does not reach this: `fabric` is the snapshot the page held
  // when the menu was used, so its reference does not change while the dialog is open.
  useEffect(() => {
    if (fabric) {
      // From the name on screen and not from the alias alone: renaming an app that came
      // with a label of its own starts from that label, which is what is being looked at.
      setDraft(fabric.alias ?? fabric.label ?? '');
    }
  }, [fabric]);

  return (
    <Confirm
      isOpened={fabric !== null}
      heading={t('matter.labels.rename-heading')}
      acceptLabel={t('matter.buttons.rename-save')}
      cancelLabel={t('matter.buttons.rename-cancel')}
      isLoading={matterStore.renamingIndex !== null}
      closeCallback={onClose}
      confirmCallback={async () => {
        if (fabric && await matterStore.rename(fabric.index, draft)) {
          onClose();
        }
      }}
    >
      <Input
        value={draft}
        ariaLabel={t('matter.labels.rename-field')}
        placeholder={t('matter.labels.rename-placeholder')}
        autoFocus
        isFullWidth
        // Cut here as well as refused by the bridge: a name that was silently too long
        // would come back as a failed save with nothing on screen to point at.
        onChange={(value) => setDraft(String(value).slice(0, APP_NAME_MAX_LENGTH))}
      />
      <p className="matter-dialogText">{t('matter.labels.rename-local')}</p>
      <p className="matter-dialogText">{t('matter.labels.rename-empty')}</p>
      {matterStore.hasRenameFailed && (
        <p className="matter-dialogText matter-dialogError">{t('matter.labels.rename-failed')}</p>
      )}
    </Confirm>
  );
});
