import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Confirm } from '@/components/confirm';
import { PageLayout } from '@/layouts/page';
import { authStore, UserRole } from '@/stores/auth';
import { configuratorStore } from '@/stores/configurator';
import { type MatterDevice, type MatterFabric, matterStore } from '@/stores/matter';
import { uiStore } from '@/stores/ui';
import { DevicesCard } from './components/devices-card';
import { FabricLabelDialog } from './components/fabric-label-dialog';
import { FabricsCard } from './components/fabrics-card';
import { PairingWindow } from './components/pairing-window';
import { SettingsCard } from './components/settings-card';
import { FabricMenuAction } from './types';
import { configuratorSelection, fabricDisplayLabel, timeLeft } from './utils';
import './styles.css';

// The menu entry is shipped by wb-mqtt-matter-bridge itself, so its id in the custom
// menu is the only sign the frontend has that the service is installed. The route exists
// in any case, and without this check the page would ask a service that is not there.
const MODULE_ID = 'matter';

// The network problems this page has its own words for. Any other code means a service
// newer than the page, and then its English sentence is better than nothing.
const NETWORK_CODES = new Set(['no_ipv6', 'config_unread']);

/**
 * Re-renders once a second while a window is open, so the countdown moves between the
 * polls of the store. Nothing else needs a clock, so it stops as soon as the window is
 * closed.
 */
const useNow = (isTicking: boolean) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!isTicking) {
      return undefined;
    }
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isTicking]);
  return now;
};

const MatterPage = observer(() => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // buildMenu fills menuItems and modules in one go, so an empty menu means /ui/menu has
  // not answered yet: the module is not missing, it is still unknown.
  const isMenuLoaded = uiStore.menuItems.length > 0;
  const isInstalled = uiStore.modules.includes(MODULE_ID);
  const isAdmin = authStore.hasRights(UserRole.Admin);
  const { status, isLoading, isUnreachable } = matterStore;
  // The fabric whose "unpair" button was pressed, and so the one the dialog talks about.
  const [unpairFrom, setUnpairFrom] = useState<MatterFabric | null>(null);
  // The "change the code" dialog. A dialog and not a plain button because the act has a
  // cost the operator cannot see from here: an app that remembered the old code will
  // offer the wrong one afterwards.
  const [isChangingCode, setChangingCode] = useState(false);
  // The fabric being labelled. Kept apart from the store so that a poll arriving
  // mid-edit cannot overwrite what is being typed.
  const [labelFor, setLabelFor] = useState<MatterFabric | null>(null);
  const now = useNow(Boolean(status?.pairing));

  useEffect(() => {
    if (!isInstalled || !isAdmin) {
      return undefined;
    }
    matterStore.startWatching();
    return () => matterStore.stopWatching();
  }, [isInstalled, isAdmin]);

  /**
   * Opens the card of the device in the configurator. The selection is set on the store
   * of that page, which keeps it through its own load: no file of the configurator is
   * touched for this. On a narrow screen its page opens on the list, with the device
   * already selected there.
   */
  const openInConfigurator = (device: MatterDevice) => {
    const selection = configuratorSelection(device);
    if (selection) {
      configuratorStore.select(selection);
    }
    navigate('/configurator');
  };

  const chooseFabricAction = (fabric: MatterFabric, action: FabricMenuAction) => {
    if (action === FabricMenuAction.Unpair) {
      setUnpairFrom(fabric);
      return;
    }
    setLabelFor(fabric);
  };

  const errors = [];
  if (isMenuLoaded && !isInstalled) {
    errors.push({ variant: 'danger', text: t('matter.labels.unavailable') });
  } else if (isUnreachable) {
    errors.push({ variant: 'danger', text: t('matter.labels.unreachable') });
  } else {
    // Not one instead of another: each of the three is true by itself, and a person who
    // fixed the first should not find the second only then.
    if (status?.network_error) {
      errors.push({
        variant: 'danger',
        text: NETWORK_CODES.has(status.network_error.code)
          ? t(`matter.labels.network-${status.network_error.code}`)
          : t('matter.labels.network-error', { reason: status.network_error.reason }),
      });
    }
    if (status?.broker_error) {
      errors.push({ variant: 'danger', text: t('matter.labels.broker-lost') });
    }
    if (status?.devices.config_error) {
      // A config that cannot be read leaves the bridge working on the last good one, so
      // this is a warning over the data and not an error instead of it.
      errors.push({ variant: 'warn', text: t('matter.labels.config-error', { error: status.devices.config_error }) });
    }
  }

  return (
    <PageLayout
      title={t('matter.title')}
      hasRights={isAdmin}
      isLoading={!isMenuLoaded || (isInstalled && isLoading)}
      errors={errors}
    >
      {isInstalled && status && (
        <>
          <p className="matter-subtitle">{t('matter.labels.subtitle')}</p>

          <FabricsCard
            fabrics={status.fabrics}
            fabricsSince={status.fabrics_since}
            onAction={chooseFabricAction}
          >
            <PairingWindow
              pairing={status.pairing}
              isEmpty={status.fabrics.length === 0}
              left={status.pairing ? timeLeft(status.pairing.closes_at, now + matterStore.clockOffset) : ''}
              isChanging={matterStore.isChangingWindow}
              hasFailed={matterStore.hasWindowFailed}
              onOpen={() => matterStore.openWindow()}
              onClose={() => matterStore.closeWindow()}
              onNewCode={() => setChangingCode(true)}
            />
          </FabricsCard>

          <DevicesCard devices={status.devices} onOpen={openInConfigurator} />

          {/* A bridge older than this page has no settings, and then there is no card. */}
          {status.settings && (
            <SettingsCard
              settings={status.settings}
              isSaving={matterStore.isSavingSettings}
              hasFailed={matterStore.hasSettingsFailed}
              onChange={matterStore.setSettings}
            />
          )}

          <Confirm
            isOpened={isChangingCode}
            heading={t('matter.labels.new-code-heading')}
            variant="danger"
            acceptLabel={t('matter.buttons.new-code-confirm')}
            cancelLabel={t('matter.buttons.new-code-cancel')}
            isLoading={matterStore.isChangingWindow}
            closeCallback={() => setChangingCode(false)}
            confirmCallback={async () => {
              if (await matterStore.changeCode()) {
                setChangingCode(false);
              }
            }}
          >
            <p className="matter-dialogText">{t('matter.labels.new-code-why')}</p>
            <p className="matter-dialogText matter-dialogWarn">{t('matter.labels.new-code-cost')}</p>
            <p className="matter-dialogText">{t('matter.labels.new-code-when')}</p>
            {matterStore.hasWindowFailed && (
              <p className="matter-dialogText matter-dialogError">{t('matter.labels.new-code-failed')}</p>
            )}
          </Confirm>

          {/* Unpairing in the app comes first because unpairing from here leaves the
              bridge and its devices in that app until somebody deletes them by hand.
              See docs/ecosystems.md of wb-mqtt-matter-bridge, Я10 and Я11. */}
          <Confirm
            isOpened={unpairFrom !== null}
            heading={t('matter.labels.unpair-heading')}
            variant="danger"
            acceptLabel={t('matter.buttons.unpair-here')}
            cancelLabel={t('matter.buttons.unpair-close')}
            isLoading={matterStore.unpairingIndex !== null}
            closeCallback={() => setUnpairFrom(null)}
            confirmCallback={async () => {
              if (unpairFrom && await matterStore.unpair(unpairFrom.index)) {
                setUnpairFrom(null);
              }
            }}
          >
            <p className="matter-dialogText">
              {t('matter.labels.unpair-where', { label: unpairFrom ? fabricDisplayLabel(unpairFrom, t) : '' })}
            </p>
            <p className="matter-dialogText">{t('matter.labels.unpair-why')}</p>
            <p className="matter-dialogText">{t('matter.labels.unpair-code')}</p>
            <p className="matter-dialogText matter-dialogWarn">{t('matter.labels.unpair-here-note')}</p>
            {matterStore.hasUnpairFailed && (
              <p className="matter-dialogText matter-dialogError">{t('matter.labels.unpair-failed')}</p>
            )}
          </Confirm>

          <FabricLabelDialog fabric={labelFor} onClose={() => setLabelFor(null)} />
        </>
      )}
    </PageLayout>
  );
});

export default MatterPage;
