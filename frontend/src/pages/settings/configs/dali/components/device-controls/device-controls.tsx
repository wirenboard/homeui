import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Cell as CellContent } from '@/components/cell';
import { CollapsiblePanel } from '@/components/collapsible-panel';
import { mqttClient } from '@/services/mqtt-client';
import Cell from '@/stores/devices/cell';
import './styles.css';

/**
 * The device's live controls — the same brightness, state and colour controls
 * wb-mqtt-dali publishes over MQTT for the Devices view, embedded into the
 * configurator's device page, so commissioning a device and trying the result
 * happen in one place.
 *
 * Everything flows through the daemon's ordinary retained topics
 * (`/devices/<id>/controls/…`), so this works identically against a
 * controller's broker and the standalone editor's in-browser loopback broker.
 */
export const DeviceControls = observer(({ mqttId }: { mqttId: string }) => {
  const { t } = useTranslation();
  const [cells, setCells] = useState<Cell[]>([]);

  useEffect(() => {
    if (!mqttId) {
      setCells([]);
      return undefined;
    }

    const byName = new Map<string, Cell>();

    const ensure = (controlName: string): Cell => {
      let cell = byName.get(controlName);
      if (!cell) {
        cell = new Cell(`${mqttId}/${controlName}`, async (deviceId, controlId, value) => {
          mqttClient.send(`/devices/${deviceId}/controls/${controlId}/on`, value, false);
        });
        byName.set(controlName, cell);
        // A new control appeared; values and meta keep flowing into the
        // existing observable cells without re-rendering the list.
        setCells([...byName.values()]);
      }
      return cell;
    };

    const base = `/devices/${mqttId}/controls/`;
    const topics: Array<[string, (name: string, payload: string) => void]> = [
      [`${base}+`, (name, payload) => ensure(name).receiveValue(payload)],
      [`${base}+/meta`, (name, payload) => ensure(name).setMeta(payload)],
      [`${base}+/meta/error`, (name, payload) => ensure(name).setError(payload)],
    ];

    topics.forEach(([pattern, apply]) => {
      mqttClient.addStickySubscription(pattern, (message) => {
        const rest = message.topic.slice(base.length);
        const name = rest.split('/')[0];
        if (name) {
          apply(name, message.payload);
        }
      });
    });

    return () => {
      topics.forEach(([pattern]) => mqttClient.unsubscribe(pattern));
      setCells([]);
    };
  }, [mqttId]);

  const visible = cells
    .filter((cell) => !cell.hidden)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  if (!visible.length) {
    return null;
  }

  return (
    // The same collapsible-section idiom the bus page uses for its Broadcast
    // settings, so the page visibly holds two things — live controls here,
    // the configuration form below — rather than looking like one form that
    // starts strangely.
    <div className="daliDeviceControls">
      <CollapsiblePanel title={t('dali.labels.device-controls')}>
        <div className="daliDeviceControls-grid">
          {visible.map((cell) => (
            <div className="daliDeviceControls-cell" key={cell.id}>
              <CellContent cell={cell} hideHistory={true} />
            </div>
          ))}
        </div>
      </CollapsiblePanel>
    </div>
  );
});
