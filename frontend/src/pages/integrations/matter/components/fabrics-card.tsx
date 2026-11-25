import { type PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from 'react-responsive';
import { MAX_MOBILE_WIDTH } from '@/common/breakpoints';
import { Card } from '@/components/card';
import { Table, TableCell, TableRow } from '@/components/table';
import type { MatterFabric } from '@/stores/matter';
import { useOpened, useTimes } from '../hooks';
import type { FabricsCardProps } from '../types';
import { fabricDisplayLabel } from '../utils';
import { DetailsToggle } from './details';
import { FabricDetails } from './fabric-details';
import { FabricMenu } from './fabric-menu';
import { FabricLines, FabricName } from './fabric-parts';

/**
 * The fabrics paired with this bridge, in the same style as the devices under them: the
 * name with whose it is, when it was paired, and its status in three lines. Columns on a
 * wide screen, the same blocks stacked on a phone; the button of a row opens the details
 * of its fabric, the menu beside it holds what can be done to it.
 *
 * The date keeps a column of its own: it is the one fact here that is compared between
 * rows - which of these did I add when.
 *
 * What is put inside the card goes under the list: the page puts the pairing window there,
 * so that the way to add a fabric is the last line of the list of fabrics.
 */
export const FabricsCard = ({
  fabrics, fabricsSince, onAction, now = Date.now(), checkingIndex = null, failedCheckIndex = null,
  onCheck, children,
}: PropsWithChildren<FabricsCardProps>) => {
  const { t } = useTranslation();
  const isMobile = useMediaQuery({ maxWidth: MAX_MOBILE_WIDTH });
  const [isOpened, toggle] = useOpened();
  const { minute, longDay } = useTimes(now);

  /**
   * When a fabric was paired. Absolute and to the minute, because it is compared between
   * rows. The bound of an unknown pairing carries no minutes: the moment it names is when
   * this controller started keeping dates, not when anything happened to the fabric.
   */
  const pairedText = (fabric: MatterFabric) => {
    switch (fabric.paired_kind) {
      case 'dated':
        return minute(fabric.paired_at);
      case 'before':
        return t('matter.labels.paired-before', { date: longDay(fabricsSince) });
      default:
        return t('matter.labels.paired-unknown');
    }
  };

  const buttonsOf = (fabric: MatterFabric) => (
    <>
      <DetailsToggle
        isOpened={isOpened(fabric.index)}
        label={t('matter.buttons.fabric-details', { label: fabricDisplayLabel(fabric, t) })}
        onToggle={() => toggle(fabric.index)}
      />
      <FabricMenu label={fabricDisplayLabel(fabric, t)} onChoose={(action) => onAction(fabric, action)} />
    </>
  );

  const detailsOf = (fabric: MatterFabric) => (
    <FabricDetails
      fabric={fabric}
      now={now}
      isChecking={checkingIndex === fabric.index}
      hasCheckFailed={failedCheckIndex === fabric.index}
      onCheck={() => onCheck?.(fabric)}
    />
  );

  const fabricRows = (
    <ul className="matter-rows">
      {fabrics.map((fabric) => (
        <li className="matter-row matter-rowWithDetails" key={fabric.index}>
          <div className="matter-rowMain">
            <FabricName fabric={fabric} />
            <span className="matter-rowLine">
              {`${t('matter.labels.column-paired')}: ${pairedText(fabric)}`}
            </span>
            <div className="matter-rowBlock"><FabricLines fabric={fabric} now={now} /></div>
          </div>
          <div className="matter-rowAction">{buttonsOf(fabric)}</div>
          {isOpened(fabric.index) && detailsOf(fabric)}
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
            <TableCell width="26%">{t('matter.labels.column-fabric')}</TableCell>
            <TableCell>{t('matter.labels.column-paired')}</TableCell>
            <TableCell className="matter-linesCell">{t('matter.labels.column-status')}</TableCell>
            <TableCell>
              <span className="matter-srOnly">{t('matter.labels.column-actions')}</span>
            </TableCell>
          </TableRow>

          {fabrics.flatMap((fabric) => [
            <TableRow key={fabric.index}>
              <TableCell verticalAlign="top"><FabricName fabric={fabric} /></TableCell>
              <TableCell verticalAlign="top">
                <span className="matter-fabricWhen">{pairedText(fabric)}</span>
              </TableCell>
              <TableCell className="matter-linesCell" verticalAlign="top">
                <FabricLines fabric={fabric} now={now} />
              </TableCell>
              <TableCell verticalAlign="top">
                <span className="matter-rowButtons">{buttonsOf(fabric)}</span>
              </TableCell>
            </TableRow>,
            isOpened(fabric.index) && (
              <TableRow key={`${fabric.index}-details`} className="matter-detailsRow">
                <TableCell colSpan={4}>{detailsOf(fabric)}</TableCell>
              </TableRow>
            ),
          ])}
        </Table>
      )}
      {children}
    </Card>
  );
};
