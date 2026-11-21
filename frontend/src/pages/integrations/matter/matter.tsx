import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Confirm } from '@/components/confirm';
import { PageLayout } from '@/layouts/page';
import { authStore, UserRole } from '@/stores/auth';
import { configuratorStore } from '@/stores/configurator';
import { type MatterDevice, type MatterFabric, matterStore, pairingQrUrl } from '@/stores/matter';
import { uiStore } from '@/stores/ui';
import { CopyField } from './components/copy-field';
import { DevicesCard } from './components/devices-card';
import { FabricLabelDialog } from './components/fabric-label-dialog';
import { FabricsCard } from './components/fabrics-card';
import { SettingsCard } from './components/settings-card';
import { FabricMenuAction } from './types';
import { configuratorSelection, fabricDisplayLabel, groupManualCode, timeLeft } from './utils';
import './styles.css';

// The menu entry is shipped by wb-mqtt-matter-bridge itself, so its id in the custom
// menu is the only sign the frontend has that the service is installed. The route exists
// in any case, and without this check the page would ask a service that is not there.
const MODULE_ID = 'matter';

// The network problems this page has its own words for. Any other code means a service
// newer than the page, and then its English sentence is better than nothing.
const NETWORK_CODES = new Set(['no_ipv6']);

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

          {/* The bridge comes up with the window closed, so this card has two faces: a
              button that opens one, and the code while it is open. Pairing starts when
              a person asks for it and never on its own - see R15 in
              docs/design-config-and-pairing.md of wb-mqtt-matter-bridge. */}
          {!status.pairing && (
            <Card className="matter-card" heading={t('matter.labels.pairing')}>
              <p className="matter-windowText">
                {t(status.paired ? 'matter.labels.window-closed-paired' : 'matter.labels.window-closed')}
              </p>
              <p className="matter-windowText">{t('matter.labels.window-closed-why')}</p>
              <div className="matter-windowActions">
                <Button
                  variant="primary"
                  label={t('matter.buttons.open-window')}
                  isLoading={matterStore.isChangingWindow}
                  disabled={matterStore.isChangingWindow}
                  onClick={() => matterStore.openWindow()}
                />
                {/* Only here, with the window closed: the bridge refuses to change the
                    code under an open window, which runs on the code it was opened
                    with. Offering the button there would be offering a refusal. */}
                <Button
                  size="small"
                  variant="secondary"
                  label={t('matter.buttons.new-code')}
                  disabled={matterStore.isChangingWindow}
                  onClick={() => setChangingCode(true)}
                />
                {matterStore.hasWindowFailed && (
                  <span className="matter-dialogError">{t('matter.labels.window-failed')}</span>
                )}
              </div>
            </Card>
          )}

          {status.pairing && (
            <Card className="matter-card" heading={t('matter.labels.pairing')}>
              <div className="matter-pairing">
                <div className="matter-qr">
                  <img
                    className="matter-qrImage"
                    src={pairingQrUrl(status.pairing.qr_version)}
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
                      text={groupManualCode(status.pairing.manual_code)}
                      value={status.pairing.manual_code}
                    />
                    <CopyField
                      label={t('matter.labels.payload')}
                      text={status.pairing.payload}
                      value={status.pairing.payload}
                    />
                  </div>

                  <div className="matter-windowActions">
                    <span className="matter-countdown">
                      {t('matter.labels.window-left', {
                        left: timeLeft(status.pairing.closes_at, now + matterStore.clockOffset),
                      })}
                    </span>
                    <Button
                      size="small"
                      variant="secondary"
                      label={t('matter.buttons.close-window')}
                      isLoading={matterStore.isChangingWindow}
                      disabled={matterStore.isChangingWindow}
                      onClick={() => matterStore.closeWindow()}
                    />
                  </div>
                  <p className="matter-hint">{t('matter.labels.window-new-code')}</p>
                  {matterStore.hasWindowFailed && (
                    <p className="matter-dialogError">{t('matter.labels.window-failed')}</p>
                  )}
                </div>
              </div>
            </Card>
          )}

          <FabricsCard
            fabrics={status.fabrics}
            fabricsSince={status.fabrics_since}
            onAction={chooseFabricAction}
          />

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
