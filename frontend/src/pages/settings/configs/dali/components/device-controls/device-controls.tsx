import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from 'react-responsive';
import { Cell as CellContent } from '@/components/cell';
import { mqttClient } from '@/services/mqtt-client';
import Cell from '@/stores/devices/cell';
import { sendCellValueUpdate } from '@/stores/devices/send-cell-value';
import type { DeviceControlsProps, ReadbackSuffixProps, StripEntry, Translate } from './types';
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

export const FEATURED_LIMIT = 6;

/**
 * The cells worth pinning, from structure rather than device-specific names:
 * readings (read-only cells that are NOT part of a per-instance family), the
 * actuator ranges (a lamp's Wanted Level, a colour temperature), colour
 * pickers, and the two universally-wanted buttons — Off and its "on"
 * counterpart, Recall Max Level.
 *
 * "Per-instance family" is detected by stripping a trailing index and counting
 * siblings: a DALI-2 sensor publishes "Button 2".."Button 18" (17 of a kind) —
 * noise for a pinned strip — while "Occupied 0" is a singleton reading even
 * though it, too, carries its instance number.
 */
const familyBase = (cell: Cell) => cell.name.replace(/\s\d+$/, '');

export function pickFeatured(cells: Cell[]): Cell[] {
  const byOrder = [...cells].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const familySize = new Map<string, number>();
  byOrder.forEach((cell) => {
    const base = familyBase(cell);
    familySize.set(base, (familySize.get(base) ?? 0) + 1);
  });
  const readings = byOrder.filter(
    (cell) =>
      cell.readOnly && cell.type !== 'pushbutton' && (familySize.get(familyBase(cell)) ?? 0) < 3,
  );
  const writable = byOrder.filter((cell) => !cell.readOnly);
  const ranges = writable.filter((cell) => cell.type === 'range');
  const colours = writable.filter((cell) => cell.type === 'rgb');
  // Match by the wire control id first (stable), by the English title second
  // (what gear devices carry) — never by the localized display name alone.
  const named = (id: string, title: string) =>
    writable
      .filter((cell) => cell.controlId === id || cell.controlId === title || cell.name === title)
      .slice(0, 1);
  const off = named('off', 'Off');
  const recallMax = named('recall_max_level', 'Recall Max Level');
  const seen = new Set<string>();
  // Priority when the limit bites: live readings, the primary slider, colour,
  // Off — then the nice-to-haves: Recall Max and the secondary sliders
  // (colour temperature, white channel). Broadcast and group devices have no
  // readings, which is exactly what frees the room for the extras.
  return [...readings, ...ranges.slice(0, 1), ...colours, ...off, ...recallMax, ...ranges.slice(1)]
    .filter((cell) => !seen.has(cell.id) && seen.add(cell.id))
    .slice(0, FEATURED_LIMIT);
}

/**
 * Setpoint ↔ readback pairs, by the daemon's wire control ids (see
 * `control_ids.py`): a lamp publishes "Actual Level" next to "Wanted Level",
 * "Current RGB" next to "Set RGB", and so on. Shown merged — the setpoint
 * control with the live readback in brackets — the pair takes one slot
 * instead of two.
 */
const SETPOINT_OF: Record<string, string> = {
  actual_level: 'wanted_level',
  current_rgb: 'set_rgb',
  current_white: 'set_white',
  current_colour_temperature: 'set_colour_temperature',
  current_x_coordinate: 'set_x_coordinate',
  current_y_coordinate: 'set_y_coordinate',
};

const setpointIdFor = (controlId: string): string | undefined => {
  const primary = /^current_primary_n(\d+)$/.exec(controlId);
  return primary ? `set_primary_n${primary[1]}` : SETPOINT_OF[controlId];
};

/**
 * Fold readbacks into their setpoint controls: a featured reading whose
 * setpoint exists is shown AS the setpoint (so the strip is operable, not just
 * observable), and a featured setpoint gets its live reading as a suffix.
 */
export function mergeReadbacks(featured: Cell[], all: Cell[]): StripEntry[] {
  const byControlId = new Map(all.map((cell) => [cell.controlId, cell]));
  const readbackOf = new Map<string, Cell>();
  all.forEach((cell) => {
    if (!cell.readOnly) {
      return;
    }
    const setpointId = setpointIdFor(cell.controlId);
    const setpoint = setpointId ? byControlId.get(setpointId) : undefined;
    if (setpoint && !setpoint.readOnly) {
      readbackOf.set(setpoint.id, cell);
    }
  });
  const entries: StripEntry[] = [];
  const seen = new Set<string>();
  featured.forEach((cell) => {
    const setpointId = cell.readOnly ? setpointIdFor(cell.controlId) : undefined;
    const setpoint = setpointId ? byControlId.get(setpointId) : undefined;
    const shown = setpoint && !setpoint.readOnly ? setpoint : cell;
    if (seen.has(shown.id)) {
      return;
    }
    seen.add(shown.id);
    const readback = readbackOf.get(shown.id);
    entries.push(readback ? { cell: shown, readback } : { cell: shown });
  });
  return entries;
}

/** The setpoints with an explicit quantity label; the rest fall back to the prefix strip. */
const LABELLED_SETPOINTS = new Set(Object.values(SETPOINT_OF));
const PRIMARY_SETPOINT = /^set_primary_n(\d+)$/;
const WANTED_PREFIX = /^(?:wanted|желаем(?:ый|ая|ое|ые))\s+/i;

/**
 * What a strip slot is called. The daemon names the writable half of a pair
 * for the write — "Wanted Level", «Желаемая яркость» — which reads as a
 * different quantity from the live value printed right next to it, so the
 * strip uses the quantity itself: by the wire control id where we know it
 * (see `control_ids.py`), by dropping the daemon's prefix where we do not.
 */
export function stripLabel(cell: Cell, t: Translate): string {
  const primary = PRIMARY_SETPOINT.exec(cell.controlId);
  if (primary) {
    return t('dali.labels.setpoint.set_primary_n', { n: primary[1] });
  }
  if (LABELLED_SETPOINTS.has(cell.controlId)) {
    return t(`dali.labels.setpoint.${cell.controlId}`);
  }
  const plain = cell.name.replace(WANTED_PREFIX, '');
  return plain === cell.name ? cell.name : plain.charAt(0).toUpperCase() + plain.slice(1);
}

const peekValue = (cell: Cell, t: Translate): string => {
  if (cell.type === 'switch' || typeof cell.value === 'boolean') {
    return cell.value ? t('dali.labels.state-on') : t('dali.labels.state-off');
  }
  const value = cell.value === null || cell.value === undefined || cell.value === '' ? '—' : String(cell.value);
  return cell.units ? `${value} ${cell.units}` : value;
};

/** The wire carries colour both ways: "#rrggbb" from the daemon, "r;g;b" per the conventions. */
const asCssColour = (value: string) =>
  (value.startsWith('#') ? value : `rgb(${value.split(';').join(',')})`);

/**
 * The live reading, rendered small next to its setpoint control. Now that the
 * slot is named for the quantity, the bracketed number no longer says what it
 * is, so it carries the explanation as a tooltip.
 */
export const ReadbackSuffix = observer(({ cell }: ReadbackSuffixProps) => {
  const { t } = useTranslation();
  const hint = t('dali.labels.readback-tooltip');
  if (cell.type === 'rgb' && typeof cell.value === 'string' && cell.value) {
    return (
      <span
        className="daliDeviceControls-readback daliDeviceControls-swatch"
        title={`${hint}: ${cell.value}`}
        style={{ background: asCssColour(String(cell.value)) }}
      />
    );
  }
  return (
    <span className="daliDeviceControls-readback" title={hint}>
      ({peekValue(cell, t)})
    </span>
  );
});

export const DeviceControls = observer(({ mqttId }: DeviceControlsProps) => {
  const { t } = useTranslation();
  const [cells, setCells] = useState<Cell[]>([]);
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const isPhone = useMediaQuery({ maxWidth: 767 });

  // A private per-device cell store rather than devicesStore on purpose:
  // getDeviceCells rides the always-on `/devices/#` firehose and its own
  // completeness rules, while this page shows exactly one device at a time
  // over a loopback broker where three narrow subscriptions are cheap.
  useEffect(() => {
    if (!mqttId) {
      setCells([]);
      return undefined;
    }

    const byName = new Map<string, Cell>();

    const ensure = (controlName: string): Cell => {
      let cell = byName.get(controlName);
      if (!cell) {
        cell = new Cell(`${mqttId}/${controlName}`, sendCellValueUpdate);
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

  // Plain calls, not useMemo: `visible` is rebuilt every render, so a memo
  // keyed on it would never hit — and the lists are a few dozen cells.
  const visible = cells
    .filter((cell) => !cell.hidden)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const featured = pickFeatured(visible);
  const strip = mergeReadbacks(featured, visible);
  const stripIds = new Set(
    strip.flatMap((entry) => (entry.readback ? [entry.cell.id, entry.readback.id] : [entry.cell.id])),
  );
  const rest = visible.filter((cell) => !stripIds.has(cell.id));

  if (!visible.length) {
    return null;
  }

  if (isPhone) {
    return (
      <div className={classNames('daliDeviceControls-sheet', { 'daliDeviceControls-sheetOpen': isSheetOpen })}>
        <button
          type="button"
          className="daliDeviceControls-peek"
          aria-expanded={isSheetOpen}
          onClick={() => setSheetOpen(!isSheetOpen)}
        >
          <span className="daliDeviceControls-peekValues">
            {strip.filter(({ cell }) => cell.type !== 'pushbutton').map(({ cell, readback }) => (
              <span className="daliDeviceControls-peekItem" key={cell.id}>
                {stripLabel(cell, t)}: <b>{peekValue(readback ?? cell, t)}</b>
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
        {strip.map(({ cell, readback }) => (
          <div className="daliDeviceControls-stripCell" key={cell.id}>
            <CellContent cell={cell} name={stripLabel(cell, t)} hideHistory={true} />
            {readback && <ReadbackSuffix cell={readback} />}
          </div>
        ))}
        {rest.length > 0 && (
          // The toggle rides in the strip itself: a header below the sticky
          // strip scrolls underneath it and becomes unclickable at exactly
          // the moment someone reaches for it.
          <button
            type="button"
            className="daliDeviceControls-showAll"
            aria-expanded={showAll}
            onClick={() => setShowAll(!showAll)}
          >
            {t('dali.labels.all-controls')} {showAll ? '▴' : '▾'}
          </button>
        )}
      </div>
      {rest.length > 0 && showAll && (
        <div className="daliDeviceControls">
          <div className="daliDeviceControls-grid">
            {rest.map((cell) => (
              <div className="daliDeviceControls-cell" key={cell.id}>
                <CellContent cell={cell} hideHistory={true} />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
});
