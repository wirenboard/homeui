import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Confirm } from '@/components/confirm';
import { Table, TableCell, TableRow } from '@/components/table';
import { Tag } from '@/components/tag';
import { PageLayout } from '@/layouts/page';
import { authStore, UserRole } from '@/stores/auth';
import { configuratorStore } from '@/stores/configurator';
import { type MatterDevice, type MatterFabric, matterStore, pairingQrUrl } from '@/stores/matter';
import { uiStore } from '@/stores/ui';
import { CopyField } from './components/copy-field';
import { configuratorSelection, groupManualCode, vendorKey } from './utils';
import './styles.css';

// The menu entry is shipped by wb-mqtt-matter-bridge itself, so its id in the custom
// menu is the only sign the frontend has that the service is installed. The route exists
// in any case, and without this check the page would ask a service that is not there.
const MODULE_ID = 'matter';

const MatterPage = observer(() => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // buildMenu fills menuItems and modules in one go, so an empty menu means /ui/menu has
  // not answered yet: the module is not missing, it is still unknown.
  const isMenuLoaded = uiStore.menuItems.length > 0;
  const isInstalled = uiStore.modules.includes(MODULE_ID);
  const isAdmin = authStore.hasRights(UserRole.Admin);
  const { status, isLoading, isUnreachable } = matterStore;
  // The app whose "unpair" button was pressed, and so the one the dialog talks about.
  const [unpairFrom, setUnpairFrom] = useState<MatterFabric | null>(null);

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

  /**
   * What to call a connected app. The label of a fabric is written by the controller of
   * the ecosystem, and Yandex leaves it empty, so there has to be something else to
   * show: the name of a vendor we know, or at least its number.
   */
  const appName = (fabric: MatterFabric) => {
    if (fabric.label) {
      return fabric.label;
    }
    const key = vendorKey(fabric.vendor_id);
    return key
      ? t(`matter.labels.vendor-${key}`)
      : t('matter.labels.app-unknown', { vendor: fabric.vendor_id });
  };

  /** The name of the type, taken from the configurator so the names live in one place. */
  const deviceType = ({ type }: MatterDevice) => t(`configurator.types.${type}.name`, { defaultValue: type });

  /**
   * Why a device is not given to Matter, in the language of the page. The service sends
   * a code for exactly this, and its own English sentence stays in /status and in the
   * journal for support. An unknown code means a newer service than this page: then the
   * sentence is better than nothing.
   */
  const notExposedReason = (device: MatterDevice) => (device.reason_code
    ? t(`matter.labels.reason-${device.reason_code}`, { defaultValue: device.reason ?? '' })
    : device.reason ?? '');

  /** What the state column shows: the value of the control, or why there is none. */
  const deviceState = (device: MatterDevice) => {
    if (!device.exposed) {
      return (
        <Tag variant="gray" title={notExposedReason(device) || undefined}>
          {t('matter.labels.not-exposed')}
        </Tag>
      );
    }
    if (device.state === null) {
      return <Tag variant="warn" title={t('matter.labels.state-silent-hint')}>{t('matter.labels.state-silent')}</Tag>;
    }
    return <Tag variant={device.state === 'on' ? 'success' : 'gray'}>{t(`matter.labels.state-${device.state}`)}</Tag>;
  };

  const errors = [];
  if (isMenuLoaded && !isInstalled) {
    errors.push({ variant: 'danger', text: t('matter.labels.unavailable') });
  } else if (isUnreachable) {
    errors.push({ variant: 'danger', text: t('matter.labels.unreachable') });
  } else if (status?.devices.config_error) {
    // A config that cannot be read leaves the bridge working on the last good one, so
    // this is a warning over the data and not an error instead of it.
    errors.push({ variant: 'warn', text: t('matter.labels.config-error', { error: status.devices.config_error }) });
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
                </div>
              </div>
            </Card>
          )}

          <Card className="matter-card" heading={t('matter.labels.ecosystems')}>
            {status.fabrics.length === 0
              ? <p className="matter-empty">{t('matter.labels.ecosystems-empty')}</p>
              : (
                <ul className="matter-fabrics">
                  {status.fabrics.map((fabric) => (
                    <li key={fabric.index}>
                      {/* The row is a box of its own so that the item keeps its bullet:
                          a flex list item loses the marker. */}
                      <div className="matter-fabric">
                        <span>{appName(fabric)}</span>
                        {/* The button explains instead of acting, because the bridge has
                            no way to unpair yet. People look for "unpair" here and leave
                            the page none the wiser when there is nothing to find: better
                            to meet them with the one way that works. */}
                        <Button
                          size="small"
                          variant="secondary"
                          label={t('matter.buttons.unpair')}
                          onClick={() => setUnpairFrom(fabric)}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            <p className="matter-hint">{t('matter.labels.ecosystems-hint')}</p>
          </Card>

          <Card className="matter-card" heading={t('matter.labels.devices')}>
            {status.devices.list.length === 0
              ? <p className="matter-empty">{t('matter.labels.devices-empty')}</p>
              : (
                <Table isFullWidth>
                  <TableRow isHeading>
                    <TableCell>{t('matter.labels.column-name')}</TableCell>
                    <TableCell>{t('matter.labels.column-type')}</TableCell>
                    <TableCell>{t('matter.labels.column-room')}</TableCell>
                    <TableCell>{t('matter.labels.column-state')}</TableCell>
                  </TableRow>

                  {status.devices.list.map((device) => (
                    <TableRow
                      key={device.did}
                      className="matter-deviceRow"
                      aria-label={t('matter.labels.open-device', { name: device.name })}
                      // Not the url of the row: the selection has to be set before the
                      // configurator mounts, and a Link navigates from the cell, which
                      // is the click target and runs before this handler.
                      onClick={() => openInConfigurator(device)}
                    >
                      <TableCell>{device.name}</TableCell>
                      <TableCell>{deviceType(device)}</TableCell>
                      <TableCell>{device.area ?? ''}</TableCell>
                      <TableCell>{deviceState(device)}</TableCell>
                    </TableRow>
                  ))}
                </Table>
              )}
            <p className="matter-hint">
              {t('matter.labels.devices-count', {
                count: status.devices.configured, exposed: status.devices.exposed,
              })}
              {status.devices.skipped > 0
                && ` ${t('matter.labels.devices-skipped', { count: status.devices.skipped })}`}
              {' '}
              {t('matter.labels.devices-hint')}
              {' '}
              <Link to="/configurator">{t('matter.labels.devices-link')}</Link>
              .
            </p>
          </Card>

          {/* Unpairing from here works, but it is offered second. The Matter spec has a
              Leave event on Basic Information for exactly this case ("triggered by
              factory reset or some other manufacturer specific action") and the bridge
              emits it, but acting on it is the ecosystem's choice: the Yandex station is
              not even subscribed to that event - checked on the stand, it watches only
              the General Diagnostics ones. So the app goes on showing the bridge and its
              devices until somebody deletes them there by hand. Unpairing in the app
              leaves no such litter, which is why it comes first in this dialog.
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
              {t('matter.labels.unpair-where', { app: unpairFrom ? appName(unpairFrom) : '' })}
            </p>
            <p className="matter-dialogText">{t('matter.labels.unpair-why')}</p>
            <p className="matter-dialogText">{t('matter.labels.unpair-code')}</p>
            <p className="matter-dialogText matter-dialogWarn">{t('matter.labels.unpair-here-note')}</p>
            {matterStore.hasUnpairFailed && (
              <p className="matter-dialogText matter-dialogError">{t('matter.labels.unpair-failed')}</p>
            )}
          </Confirm>
        </>
      )}
    </PageLayout>
  );
});

export default MatterPage;
