import { format, formatDistanceToNow } from 'date-fns';
import { enUS, ru } from 'date-fns/locale';
import { type PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from 'react-responsive';
import { MAX_MOBILE_WIDTH } from '@/common/breakpoints';
import { Card } from '@/components/card';
import { Table, TableCell, TableRow } from '@/components/table';
import type { MatterFabric } from '@/stores/matter';
import { useOpened } from '../hooks';
import type { FabricsCardProps } from '../types';
import { fabricDisplayLabel, fabricLabelNote } from '../utils';
import { DetailsToggle } from './details';
import { FabricDetails } from './fabric-details';
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
 *
 * A row opens into the details of its fabric.
 *
 * What is put inside the card goes under the list: the page puts the pairing window there,
 * so that the way to add a fabric is the last line of the list of fabrics.
 */
export const FabricsCard = ({
  fabrics, fabricsSince, onAction, now, checkingIndex = null, hasCheckFailed = false,
  onCheck, children,
}: PropsWithChildren<FabricsCardProps>) => {
  const { t, i18n } = useTranslation();
  const isMobile = useMediaQuery({ maxWidth: MAX_MOBILE_WIDTH });
  const [isOpened, toggle] = useOpened();
  // Matching the rest of the interface rather than inventing a format for this page.
  const dateFormat = i18n.language === 'ru' ? 'dd.MM.yyyy, HH:mm' : 'dd/MM/yyyy, HH:mm';
  // The bound on an unknown pairing has no business carrying minutes: the moment it
  // names is when this controller started keeping dates, not when anything happened to
  // the fabric. The year stays, because a bound without one is ambiguous every January.
  const boundFormat = 'd MMMM yyyy';
  const dateLocale = i18n.language === 'ru' ? ru : enUS;

  /**
   * When a fabric paired. Absolute, while the status beside it is relative: this is a fact
   * compared between rows, so it has to line up and carry a year.
   */
  const pairedText = (fabric: MatterFabric) => {
    switch (fabric.paired_kind) {
      case 'dated':
        return format(fabric.paired_at, dateFormat);
      case 'before':
        return t('matter.labels.paired-before', {
          date: format(fabricsSince, boundFormat, { locale: dateLocale }),
        });
      default:
        return t('matter.labels.paired-unknown');
    }
  };

  /** The status of a fabric: the word of the bridge, and for how long where it went silent. */
  const statusText = ({ status }: MatterFabric) => t(`matter.labels.status-${status?.word ?? 'away'}`, {
    ago: Number.isFinite(status?.since) ? formatDistanceToNow(status.since, { locale: dateLocale }) : '',
  });

  const statusClass = (fabric: MatterFabric) => (fabric.online
    ? 'matter-fabricLink matter-fabricLinkOnline'
    : 'matter-fabricLink');

  const detailsButton = (fabric: MatterFabric) => (
    <DetailsToggle
      isOpened={isOpened(fabric.index)}
      label={t('matter.buttons.fabric-details', { label: fabricDisplayLabel(fabric, t) })}
      onToggle={() => toggle(fabric.index)}
    />
  );

  const details = (fabric: MatterFabric) => (
    <FabricDetails
      fabric={fabric}
      now={now ?? Date.now()}
      isChecking={checkingIndex === fabric.index}
      hasCheckFailed={hasCheckFailed && checkingIndex === null}
      onCheck={() => onCheck?.(fabric)}
    />
  );

  const fabricRows = (
    <ul className="matter-rows">
      {fabrics.map((fabric) => (
        <li className="matter-row matter-rowWithDetails" key={fabric.index}>
          <div className="matter-rowMain">
            <span className="matter-rowName">{fabricDisplayLabel(fabric, t)}</span>
            <span className="matter-rowLine">
              <span className={statusClass(fabric)}>{statusText(fabric)}</span>
            </span>
            <span className="matter-rowLine">
              {`${t('matter.labels.column-paired')}: ${pairedText(fabric)}`}
            </span>
            {fabricLabelNote(fabric, t) && <span className="matter-rowLine">{fabricLabelNote(fabric, t)}</span>}
          </div>
          <div className="matter-rowAction">
            {detailsButton(fabric)}
            <FabricMenu
              label={fabricDisplayLabel(fabric, t)}
              fabric={fabric}
              onChoose={(action) => onAction(fabric, action)}
            />
          </div>
          {isOpened(fabric.index) && details(fabric)}
        </li>
      ))}
    </ul>
  );

  return (
    <Card className="matter-card matter-fabrics" heading={t('matter.labels.fabrics')}>
      {/* Said by the card only when it stands alone: with the way to add a fabric under
          it, the invitation there is all an empty list has to say. */}
      {fabrics.length === 0 && !children && (
        <p className="matter-empty">{t('matter.labels.fabrics-empty')}</p>
      )}
      {fabrics.length > 0 && isMobile && fabricRows}
      {fabrics.length > 0 && !isMobile && (
        <Table isFullWidth>
          <TableRow isHeading>
            <TableCell>{t('matter.labels.column-fabric')}</TableCell>
            <TableCell>{t('matter.labels.column-paired')}</TableCell>
            <TableCell>{t('matter.labels.column-status')}</TableCell>
            <TableCell>
              <span className="matter-srOnly">{t('matter.labels.column-actions')}</span>
            </TableCell>
          </TableRow>

          {fabrics.flatMap((fabric) => [
            <TableRow key={fabric.index}>
              <TableCell>
                <span className="matter-fabricLabel">{fabricDisplayLabel(fabric, t)}</span>
                {fabricLabelNote(fabric, t) && (
                  <span className="matter-fabricNote">{fabricLabelNote(fabric, t)}</span>
                )}
              </TableCell>
              <TableCell>
                <span className="matter-fabricWhen">{pairedText(fabric)}</span>
              </TableCell>
              <TableCell>
                <span className={statusClass(fabric)}>{statusText(fabric)}</span>
              </TableCell>
              <TableCell>
                <span className="matter-rowButtons">
                  {detailsButton(fabric)}
                  <FabricMenu
                    label={fabricDisplayLabel(fabric, t)}
                    fabric={fabric}
                    onChoose={(action) => onAction(fabric, action)}
                  />
                </span>
              </TableCell>
            </TableRow>,
            isOpened(fabric.index) && (
              <TableRow key={`${fabric.index}-details`} className="matter-detailsRow">
                <TableCell colSpan={4}>{details(fabric)}</TableCell>
              </TableRow>
            ),
          ])}
        </Table>
      )}
      {children}
    </Card>
  );
};
