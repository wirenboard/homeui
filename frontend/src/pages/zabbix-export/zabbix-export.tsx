import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import TrashIcon from '@/assets/icons/trash.svg';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ColumnsWrapper } from '@/components/columns-wrapper';
import { Dropdown, type Option } from '@/components/dropdown';
import { PageLayout } from '@/layouts/page';
import { authStore, UserRole } from '@/stores/auth';
import { devicesStore } from '@/stores/devices';
import { useStore } from '@/utils/use-store';
import { ZabbixExportPageStore } from './store';
import './styles.css';

const ZabbixExportPage = observer(() => {
  const { t } = useTranslation();
  const store = useStore(() => new ZabbixExportPageStore());
  const [pickedDevice, setPickedDevice] = useState<string | null>(null);

  const handleAdd = () => {
    if (!pickedDevice) {
      return;
    }
    store.addDevice(pickedDevice);
    setPickedDevice(null);
  };

  return (
    <PageLayout
      title={t('zabbixExport.title')}
      hasRights={authStore.hasRights(UserRole.Admin)}
      actions={
        <div className="zabbixExport-headerActions">
          <Button
            variant="secondary"
            label={t('zabbixExport.buttons.save')}
            isLoading={store.isLoading}
            disabled={store.isLoading}
            onClick={store.save}
          />
          <Button
            variant="primary"
            label={t('zabbixExport.buttons.export')}
            isLoading={store.isLoading}
            disabled={!store.addedDevices.length || store.isLoading}
            onClick={store.export}
          />
        </div>
      }
    >
      <section className="zabbix-export">
        <p className="zabbixExport-description">{t('zabbixExport.labels.description')}</p>

        <div className="zabbixExport-picker">
          <Button
            variant="secondary"
            label={t('zabbixExport.buttons.add-device')}
            disabled={!pickedDevice}
            onClick={handleAdd}
          />
          <div className="zabbixExport-pickerField">
            <Dropdown
              key={store.addedDevices.length}
              options={store.pickerOptions}
              value={pickedDevice}
              placeholder={t('zabbixExport.labels.search-device')}
              noOptionsMessage={t('zabbixExport.labels.search-device')}
              isSearchable
              isClearable
              onChange={(option) => setPickedDevice((option as Option<string>)?.value ?? null)}
            />
          </div>
        </div>

        {store.addedDevices.length ? (
          <ColumnsWrapper baseColumnWidth={376} columnClassName="zabbixExport-column">
            {store.addedDevices.map((deviceId) => {
              const device = devicesStore.devices.get(deviceId);
              const cells = devicesStore.getDeviceCells(deviceId);
              const heading = device ? `${device.name} [${deviceId}]` : deviceId;
              // Don't let the user remove the last monitored control — the device
              // would silently drop out of the export.
              const isLastControl = store.monitoredControlsCount(deviceId) <= 1;

              return (
                <Card
                  key={deviceId}
                  heading={heading}
                  id={`zabbix-export-${deviceId}`}
                  actions={[
                    {
                      title: t('zabbixExport.buttons.remove-device'),
                      action: () => store.removeDevice(deviceId),
                      icon: TrashIcon,
                    },
                  ]}
                >
                  <div className="zabbixExport-blockControls">
                    {cells.map((cell) => {
                      const isPushbutton = cell.type === 'pushbutton';
                      const isExcluded = store.isControlExcluded(cell.id);
                      if (isExcluded) {
                        return null;
                      }
                      return (
                        <div
                          key={cell.id}
                          className={`zabbixExport-controlItem${
                            isPushbutton ? ' zabbixExport-controlItem_disabled' : ''
                          }`}
                        >
                          <span className="zabbixExport-controlName">
                            <span>{cell.name}</span>
                            <span className="zabbixExport-controlMeta">
                              {cell.controlId} · {cell.type}
                            </span>
                            {isPushbutton && (
                              <span className="zabbixExport-controlNote">
                                {t('zabbixExport.labels.pushbutton-skipped')}
                              </span>
                            )}
                          </span>
                          <Button
                            variant="unaccented"
                            size="small"
                            icon={<TrashIcon />}
                            aria-label={t('zabbixExport.buttons.delete-control')}
                            disabled={isPushbutton || isLastControl}
                            onClick={() => store.excludeControl(cell.id)}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="zabbixExport-blockActions">
                    <Button
                      variant="secondary"
                      size="small"
                      label={t('zabbixExport.buttons.refresh-device')}
                      onClick={() => store.refreshDevice(deviceId)}
                    />
                  </div>
                </Card>
              );
            })}
          </ColumnsWrapper>
        ) : (
          <Alert variant="info">{t('zabbixExport.labels.empty-list')}</Alert>
        )}
      </section>
    </PageLayout>
  );
});

export default ZabbixExportPage;
