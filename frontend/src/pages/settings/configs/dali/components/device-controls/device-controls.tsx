import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from 'react-responsive';
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
 *
 * Layout: a small *featured* set — the cells someone actually watches or
 * grabs while tuning parameters — stays pinned while the (possibly enormous)
 * configuration form scrolls: as a sticky strip under the toolbar on wide
 * screens, as a bottom sheet with a live peek line on phones. Everything else
 * lives behind "All controls". The split matters most on DALI-2 sensors,
 * where three live readings (occupancy, movement, illuminance) drown in
 * dozens of per-button event indicators otherwise.
 */

const FEATURED_LIMIT = 6;

/**
 * The cells worth pinning, from structure rather than device-specific names:
 * readings (read-only cells that are NOT part of a per-instance family), the
 * primary actuator range (a lamp's Wanted Level), and the one
 * universally-wanted button, Off.
 *
 * "Per-instance family" is detected by stripping a trailing index and counting
 * siblings: a DALI-2 sensor publishes "Button 2".."Button 18" (17 of a kind) —
 * noise for a pinned strip — while "Occupied 0" is a singleton reading even
 * though it, too, carries its instance number.
 */
const familyBase = (cell: Cell) => cell.name.replace(/\s\d+$/, '');

function pickFeatured(cells: Cell[]): Cell[] {
  const byOrder = [...cells].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const familySize = new Map<string, number>();
  byOrder.forEach((cell) => {
    const base = familyBase(cell);
    familySize.set(base, (familySize.get(base) ?? 0) + 1);
  });
  const readings = byOrder.filter(
    (cell) =>
      cell.readOnly && cell.type !== 'pushbutton' && (familySize.get(familyBase(cell)) ?? 0) < 3
  );
  const primaryRange = byOrder.filter((cell) => !cell.readOnly && cell.type === 'range').slice(0, 1);
  const off = byOrder
    .filter((cell) => !cell.readOnly && (cell.controlId === 'Off' || cell.name === 'Off'))
    .slice(0, 1);
  const seen = new Set<string>();
  return [...readings, ...primaryRange, ...off]
    .filter((cell) => !seen.has(cell.id) && seen.add(cell.id))
    .slice(0, FEATURED_LIMIT);
}

const peekValue = (cell: Cell): string => {
  if (cell.type === 'switch' || typeof cell.value === 'boolean') {
    return cell.value ? 'on' : 'off';
  }
  const value = cell.value === null || cell.value === undefined || cell.value === '' ? '—' : String(cell.value);
  return cell.units ? `${value} ${cell.units}` : value;
};

export const DeviceControls = observer(({ mqttId }: { mqttId: string }) => {
  const { t } = useTranslation();
  const [cells, setCells] = useState<Cell[]>([]);
  const [isSheetOpen, setSheetOpen] = useState(false);
  const isPhone = useMediaQuery({ maxWidth: 767 });

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
  const featured = useMemo(() => pickFeatured(visible), [visible]);
  const featuredIds = new Set(featured.map((cell) => cell.id));
  const rest = visible.filter((cell) => !featuredIds.has(cell.id));

  if (!visible.length) {
    return null;
  }

  if (isPhone) {
    return (
      <div className={isSheetOpen ? 'daliDeviceControls-sheet daliDeviceControls-sheetOpen' : 'daliDeviceControls-sheet'}>
        <button
          type="button"
          className="daliDeviceControls-peek"
          aria-expanded={isSheetOpen}
          onClick={() => setSheetOpen(!isSheetOpen)}
        >
          <span className="daliDeviceControls-peekValues">
            {featured.filter((cell) => cell.type !== 'pushbutton').map((cell) => (
              <span className="daliDeviceControls-peekItem" key={cell.id}>
                {cell.name}: <b>{peekValue(cell)}</b>
              </span>
            ))}
          </span>
          <span className="daliDeviceControls-peekChevron">{isSheetOpen ? '▾' : '▴'}</span>
        </button>
        {isSheetOpen && (
          <div className="daliDeviceControls-sheetBody">
            <div className="daliDeviceControls-grid">
              {visible.map((cell) => (
                <div className="daliDeviceControls-cell" key={cell.id}>
                  <CellContent cell={cell} hideHistory={true} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="daliDeviceControls-strip">
        {featured.map((cell) => (
          <div className="daliDeviceControls-stripCell" key={cell.id}>
            <CellContent cell={cell} hideHistory={true} />
          </div>
        ))}
      </div>
      {rest.length > 0 && (
        <div className="daliDeviceControls">
          <CollapsiblePanel
            title={t('dali.labels.all-controls')}
            isCollapsed={rest.length > 8}
          >
            <div className="daliDeviceControls-grid">
              {rest.map((cell) => (
                <div className="daliDeviceControls-cell" key={cell.id}>
                  <CellContent cell={cell} hideHistory={true} />
                </div>
              ))}
            </div>
          </CollapsiblePanel>
        </div>
      )}
    </>
  );
});
