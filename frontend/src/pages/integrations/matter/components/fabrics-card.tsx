import { format, formatDistanceToNow } from 'date-fns';
import { enUS, ru } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from 'react-responsive';
import { MAX_MOBILE_WIDTH } from '@/common/breakpoints';
import { Card } from '@/components/card';
import { Table, TableCell, TableRow } from '@/components/table';
import type { MatterFabric } from '@/stores/matter';
import { FabricLabelSource, type FabricsCardProps, LinkState, PairedDateKind } from '../types';
import {
  fabricDisplayLabel, fabricLabelSource, linkState, pairedDateKind, replacedFabricLabel,
} from '../utils';
import { FabricMenu } from './fabric-menu';

/**
 * The fabrics paired with this bridge: columns on a wide screen, stacked lines on a phone.
 *
 * Columns, because the three facts in a row are the same kind of fact for every fabric and
 * the question people bring here is a comparison between rows: which of these is still
 * talking to my house, and which did I add when. A list answers that one row at a time.
 *
 * On a phone that comparison is not on offer anyway: at 375 px the four columns ask for 394,
 * so the link state is clipped and the actions column falls off the right edge entirely.
 */
export const FabricsCard = ({ fabrics, fabricsSince, onAction }: FabricsCardProps) => {
  const { t, i18n } = useTranslation();
  const isMobile = useMediaQuery({ maxWidth: MAX_MOBILE_WIDTH });
  // Matching the rest of the interface rather than inventing a format for this page.
  const dateFormat = i18n.language === 'ru' ? 'dd.MM.yyyy, HH:mm' : 'dd/MM/yyyy, HH:mm';
  // The bound on an unknown pairing has no business carrying minutes: the moment it
  // names is when this controller started keeping dates, not when anything happened to
  // the fabric. The year stays, because a bound without one is ambiguous every January.
  const boundFormat = 'd MMMM yyyy';
  const dateLocale = i18n.language === 'ru' ? ru : enUS;

  /**
   * When a fabric paired, as an absolute date and time.
   *
   * Absolute, while the column beside it is relative, and that is the rule rather than an
   * oversight: this is a reference fact that gets compared between rows, so it has to
   * line up and carry a year. How long ago it happened is not what anybody asks of it.
   */
  const pairedText = (fabric: MatterFabric) => {
    switch (pairedDateKind(fabric, fabricsSince)) {
      case PairedDateKind.Dated:
        return format(fabric.paired_at, dateFormat);
      case PairedDateKind.Before:
        return t('matter.labels.paired-before', {
          date: format(fabricsSince, boundFormat, { locale: dateLocale }),
        });
      default:
        return t('matter.labels.paired-unknown');
    }
  };

  /**
   * Whether a fabric is on the line, and if not, since when.
   *
   * Relative, because the only question here is how fresh it is. The time is missing far
   * more often than it is present - the bridge writes it down only when a channel breaks,
   * so a restart of the service clears it for everybody - and the third case says exactly
   * that instead of showing an empty cell.
   */
  const linkText = (fabric: MatterFabric) => {
    switch (linkState(fabric)) {
      case LinkState.Online:
        return t('matter.labels.link-online');
      case LinkState.Quiet:
        return t('matter.labels.link-quiet', {
          ago: formatDistanceToNow(fabric.last_seen, { addSuffix: true, locale: dateLocale }),
        });
      default:
        return t('matter.labels.link-offline');
    }
  };

  /**
   * What the row says beside the label, when the label alone would be misleading.
   *
   * A label typed on this controller is marked with what it replaced, because it exists
   * nowhere else: an operator comparing this page with the app's own screen has to be
   * able to see which of the two names is ours. A fabric that set no label at all is
   * marked too, so that a row showing a bare number does not read as a defect.
   */
  const labelNote = (fabric: MatterFabric) => {
    switch (fabricLabelSource(fabric)) {
      case FabricLabelSource.Local:
        return t('matter.labels.fabric-label-instead', { label: replacedFabricLabel(fabric, t) });
      case FabricLabelSource.None:
        return t('matter.labels.fabric-no-label');
      default:
        return null;
    }
  };

  const linkClass = (fabric: MatterFabric) => (linkState(fabric) === LinkState.Online
    ? 'matter-fabricLink matter-fabricLinkOnline'
    : 'matter-fabricLink');

  const fabricRows = (
    <ul className="matter-rows">
      {fabrics.map((fabric) => (
        <li className="matter-row" key={fabric.index}>
          <div className="matter-rowMain">
            <span className="matter-rowName">{fabricDisplayLabel(fabric, t)}</span>
            <span className="matter-rowLine">
              <span className={linkClass(fabric)}>{linkText(fabric)}</span>
            </span>
            <span className="matter-rowLine">
              {`${t('matter.labels.column-paired')}: ${pairedText(fabric)}`}
            </span>
            {labelNote(fabric) && <span className="matter-rowLine">{labelNote(fabric)}</span>}
          </div>
          <div className="matter-rowAction">
            <FabricMenu
              label={fabricDisplayLabel(fabric, t)}
              fabric={fabric}
              onChoose={(action) => onAction(fabric, action)}
            />
          </div>
        </li>
      ))}
    </ul>
  );

  return (
    <Card className="matter-card" heading={t('matter.labels.fabrics')}>
      {fabrics.length === 0 && <p className="matter-empty">{t('matter.labels.fabrics-empty')}</p>}
      {fabrics.length > 0 && isMobile && fabricRows}
      {fabrics.length > 0 && !isMobile && (
        <Table isFullWidth>
          <TableRow isHeading>
            <TableCell>{t('matter.labels.column-fabric')}</TableCell>
            <TableCell>{t('matter.labels.column-paired')}</TableCell>
            <TableCell>{t('matter.labels.column-link')}</TableCell>
            <TableCell>
              <span className="matter-srOnly">{t('matter.labels.column-actions')}</span>
            </TableCell>
          </TableRow>

          {fabrics.map((fabric) => (
            <TableRow key={fabric.index}>
              <TableCell>
                <span className="matter-fabricLabel">{fabricDisplayLabel(fabric, t)}</span>
                {labelNote(fabric) && (
                  <span className="matter-fabricNote">{labelNote(fabric)}</span>
                )}
              </TableCell>
              <TableCell>
                <span className="matter-fabricWhen">{pairedText(fabric)}</span>
              </TableCell>
              <TableCell>
                <span className={linkClass(fabric)}>{linkText(fabric)}</span>
              </TableCell>
              <TableCell>
                <FabricMenu
                  label={fabricDisplayLabel(fabric, t)}
                  fabric={fabric}
                  onChoose={(action) => onAction(fabric, action)}
                />
              </TableCell>
            </TableRow>
          ))}
        </Table>
      )}
      <p className="matter-hint">{t('matter.labels.fabrics-hint')}</p>
    </Card>
  );
};
