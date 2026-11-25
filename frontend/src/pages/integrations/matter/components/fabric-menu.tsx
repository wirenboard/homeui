import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import MoreIcon from '@/assets/icons/more.svg';
import { Button } from '@/components/button';
import { Popup } from '@/components/popup';
import { FabricMenuAction, type FabricMenuProps } from '../types';

/**
 * The two things that can be done to one connected fabric, and nothing above them: whose
 * menu this is, the row it opens from says - its name, and its vendor under the name.
 *
 * Unpairing lives in here rather than beside every row because it cannot be undone from
 * this page: the app keeps the bridge in its own list until somebody deletes it there,
 * and a button one row off is a click somebody will make. Labelling sits above it so the
 * irreversible one is not where an errant click lands.
 *
 * Built on the shared Popup, like the overflow menu of the DALI bus monitor and the
 * options of the Alice page. That is not only for looks: Popup renders through
 * FloatingPortal, so the menu leaves the table entirely. Hand-rolled inside a cell it was
 * flattened by `.wb-tableCell * { z-index: 1 }` and drawn under the rows below it, and it
 * could not flip away from the bottom edge of the screen either.
 */
export const FabricMenu = ({ label, onChoose }: FabricMenuProps) => {
  const { t } = useTranslation();
  const [isOpen, setOpen] = useState(false);

  const choose = (action: FabricMenuAction) => {
    setOpen(false);
    onChoose(action);
  };

  return (
    <Popup
      isOpen={isOpen}
      placement="bottom-end"
      content={(
        <div className="matter-fabricMenuContent">
          <button
            type="button"
            className="matter-fabricMenuItem"
            onClick={() => choose(FabricMenuAction.SetLocalFabricLabel)}
          >
            {t('matter.buttons.set-label')}
          </button>

          <button
            type="button"
            className="matter-fabricMenuItem matter-fabricMenuItemDanger"
            onClick={() => choose(FabricMenuAction.Unpair)}
          >
            {t('matter.buttons.unpair')}
          </button>
        </div>
      )}
      onOpenChange={setOpen}
    >
      <Button
        size="small"
        type="button"
        variant="secondary"
        icon={<MoreIcon />}
        aria-label={t('matter.buttons.fabric-actions', { label })}
        isOutlined
      />
    </Popup>
  );
};
