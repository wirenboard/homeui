import { format, formatDistanceToNow } from 'date-fns';
import { enUS, ru } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/card';
import { Table, TableCell, TableRow } from '@/components/table';
import type { MatterFabric } from '@/stores/matter';
import { type AppsCardProps, LinkState, PairedDateKind } from '../types';
import { appDisplayName, linkState, pairedDateKind } from '../utils';
import { AppMenu } from './app-menu';

/**
 * The apps paired with this bridge, in columns.
 *
 * Columns and not a list, because the three facts in a row are the same kind of fact for
 * every app and the question people bring here is a comparison between rows: which of
 * these is still talking to my house, and which did I add when. A list answers that one
 * row at a time.
 */
export const AppsCard = ({ fabrics, fabricsSince, onAction }: AppsCardProps) => {
  const { t, i18n } = useTranslation();
  // Matching the rest of the interface rather than inventing a format for this page.
  const dateFormat = i18n.language === 'ru' ? 'dd.MM.yyyy, HH:mm' : 'dd/MM/yyyy, HH:mm';
  const dateLocale = i18n.language === 'ru' ? ru : enUS;

  /**
   * When an app paired, as an absolute date and time.
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
        return t('matter.labels.paired-before', { date: format(fabricsSince, dateFormat) });
      default:
        return t('matter.labels.paired-unknown');
    }
  };

  /**
   * Whether an app is on the line, and if not, since when.
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

  return (
    <Card className="matter-card" heading={t('matter.labels.ecosystems')}>
      {fabrics.length === 0
        ? <p className="matter-empty">{t('matter.labels.ecosystems-empty')}</p>
        : (
          <Table isFullWidth>
            <TableRow isHeading>
              <TableCell>{t('matter.labels.column-app')}</TableCell>
              <TableCell>{t('matter.labels.column-paired')}</TableCell>
              <TableCell>{t('matter.labels.column-link')}</TableCell>
              <TableCell>
                <span className="matter-srOnly">{t('matter.labels.column-actions')}</span>
              </TableCell>
            </TableRow>

            {fabrics.map((fabric) => (
              <TableRow key={fabric.index}>
                <TableCell>
                  <span className="matter-appName">{appDisplayName(fabric, t)}</span>
                </TableCell>
                <TableCell>
                  <span className="matter-appWhen">{pairedText(fabric)}</span>
                </TableCell>
                <TableCell>
                  <span
                    className={linkState(fabric) === LinkState.Online
                      ? 'matter-appLink matter-appLinkOnline'
                      : 'matter-appLink'}
                  >
                    {linkText(fabric)}
                  </span>
                </TableCell>
                <TableCell>
                  <AppMenu
                    appName={appDisplayName(fabric, t)}
                    fabric={fabric}
                    onChoose={(action) => onAction(fabric, action)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </Table>
        )}
      <p className="matter-hint">{t('matter.labels.ecosystems-hint')}</p>
    </Card>
  );
};
