import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { FormButtonGroup } from '@/components/form';
import { JsonSchemaEditor } from '@/components/json-schema-editor';
import { Loader } from '@/components/loader';
import type { BusStore } from '@/stores/dali';
import type { ObjectParamStore } from '@/stores/json-schema-editor/object-store';
import { useAsyncAction } from '@/utils/async-action';
import { BusMonitor } from '../bus-monitor';
import { LunatoneGatewayField } from './lunatone-gateway-field';
import { PollingIntervalField } from './polling-interval-field';
import './styles.css';

const MAX_SLOTS = 12;

const BusSettingsForm = ({ store }: { store: BusStore }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
    <PollingIntervalField store={store} />
    <LunatoneGatewayField store={store} />
  </div>
);

const BusParam = observer(({ store, param }: { store: BusStore; param: ObjectParamStore }) => {
  const { t, i18n } = useTranslation();
  const [save, isSaving] = useAsyncAction(async () => {
    await store.saveParam(param.key);
  });

  const gridColumns = param.store.schema.options?.grid_columns;
  const style: CSSProperties = {};
  if (gridColumns) {
    style.flexGrow = 1;
    style.flexBasis = gridColumns === 12 ? '100%' : `${(gridColumns / 12) * 100 - 7}%`;
  }

  return (
    <div key={param.key} className="dali-busParam" style={style}>
      <div className="dali-busParam-header">
        <span>{store.translator.find(param.store.schema.title || param.key, i18n.language)}</span>
        <Button
          label={t('dali.buttons.set')}
          isLoading={isSaving}
          disabled={param.store.hasErrors}
          onClick={save}
        />
      </div>
      <div
        className={classNames('dali-busParam-editor', {
          'wb-jsonEditor-objectEditorWithBorder': param.store.storeType === 'object',
        })}
      >
        <JsonSchemaEditor
          store={param.store}
          translator={store.translator}
        />
      </div>
    </div>
  );
});

const BusParamsTabContent = observer(({ store }: { store: BusStore }) => {
  const { t } = useTranslation();

  let rows = [];
  if (store.objectStore) {
    const params = store.objectStore.params.filter((p) => !p.hidden);

    let currentRow: typeof params = [];
    let slotsInRow = 0;
    for (const param of params) {
      const gridColumns = param.store.schema.options?.grid_columns ?? MAX_SLOTS + 1;
      if (slotsInRow === 0 || slotsInRow + gridColumns <= MAX_SLOTS) {
        slotsInRow += gridColumns;
        currentRow.push(param);
      } else {
        rows.push(currentRow);
        currentRow = [param];
        slotsInRow = gridColumns;
      }
    }
    if (currentRow.length) {
      rows.push(currentRow);
    }
  }

  return (
    <Card
      className="dali-busParams"
      variant="tertiary"
      isBodyVisible={store.broadcastSettingsVisible}
      toggleBody={() => {
        store.broadcastSettingsVisible = !store.broadcastSettingsVisible;
      }}
      heading={t('dali.labels.bus-settings')}
    >
      {store.isParametersSchemaLoading ? (
        <div className="dali-contentLoader">
          <Loader />
        </div>
      ) : (
        <>
          {rows.map((rowParams) => {
            const rowKey = rowParams.map((p) => p.key).join('-');
            const items = rowParams.map((param) => (
              <BusParam key={param.key} store={store} param={param} />
            ));
            if (rowParams.length === 1) {
              return items[0];
            }
            return (
              <div key={rowKey} className="wb-jsonEditor-objectEditorRow">
                {items}
              </div>
            );
          })}
        </>
      )}
    </Card>
  );
});

export const BusTabContent = observer(({ store, onScan }: { store: BusStore; onScan: () => void }) => {
  const { t } = useTranslation();

  if (store.isLoading) {
    return (
      <div className="dali-contentLoader">
        <Loader />
      </div>
    );
  }

  return (
    <>
      {store.isScanning ? (
        <div className="dali-contentLoader">
          <Loader />
        </div>
      ) : (
        <>
          <FormButtonGroup>
            <Button
              label={t('dali.buttons.rescan')}
              onClick={async () => {
                await store.scan();
                onScan();
              }}
            />
          </FormButtonGroup>
          <BusSettingsForm store={store} />
          <BusParamsTabContent store={store} />
        </>
      )}
      <BusMonitor
        monitorStore={store.busMonitor}
        busMonitorEnabled={store.busMonitorEnabled}
        onToggle={(v) => store.setBusMonitorEnabled(v)}
      />
    </>
  );
});
