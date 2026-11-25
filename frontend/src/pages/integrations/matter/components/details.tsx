import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import CheckIcon from '@/assets/icons/check.svg';
import ChevronDownIcon from '@/assets/icons/chevron-down.svg';
import ChevronUpIcon from '@/assets/icons/chevron-up.svg';
import CopyIcon from '@/assets/icons/copy.svg';
import { useCopy } from '../hooks';
import type {
  DetailsFactsProps, DetailsProps, DetailsSectionProps, DetailsToggleProps,
} from '../types';
import { detailsText } from '../utils';
import { StatusLine } from './status-line';

/** The button of a row that opens its details and closes them. */
export const DetailsToggle = ({ isOpened, label, onToggle }: DetailsToggleProps) => (
  <button
    type="button"
    className="matter-detailsToggle"
    aria-expanded={isOpened}
    aria-label={label}
    onClick={onToggle}
  >
    {isOpened ? <ChevronUpIcon aria-hidden="true" /> : <ChevronDownIcon aria-hidden="true" />}
  </button>
);

export const Section = ({ title, children }: DetailsSectionProps) => (
  <section className="matter-detailsSection">
    <h4 className="matter-detailsHeading">{title}</h4>
    {children}
  </section>
);

/**
 * Facts as a list: a name and what stands beside it. A row may also say how it came out;
 * where any row of the list does, every name keeps the place of a sign - so the names
 * stay in one column, and the one that is a problem carries its triangle.
 */
export const Facts = ({ rows }: DetailsFactsProps) => {
  const hasSigns = rows.some(([, , status]) => status);
  return (
    <dl className="matter-facts">
      {rows.map(([name, value, status], order) => (
        // With its place: two commands of one second carry the same label.
        <div className="matter-fact" key={`${String(name)}-${order}`}>
          <dt>{hasSigns ? <StatusLine status={status ?? 'ok'}>{name}</StatusLine> : name}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
};

/**
 * The details of a row, of a fabric or of a device alike: sections of facts, and in the
 * corner a quiet button that copies them as text - to send to support what the page says.
 */
export const Details = ({ title, children, footer }: DetailsProps) => {
  const { t } = useTranslation();
  const body = useRef<HTMLDivElement>(null);
  const [isCopied, copy] = useCopy(() => detailsText(title, body.current));

  return (
    <div className="matter-details">
      <button
        type="button"
        className="matter-detailsCopy"
        title={t(isCopied ? 'matter.buttons.copied' : 'matter.buttons.copy')}
        aria-label={t('matter.buttons.copy')}
        onClick={copy}
      >
        {isCopied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
      </button>
      {/* The icon changes for the eye; this says the same to a screen reader. */}
      <span className="matter-srOnly" role="status">{isCopied ? t('matter.labels.copied') : ''}</span>
      <div ref={body} className="matter-detailsBody">{children}</div>
      {footer && <div className="matter-detailsFooter">{footer}</div>}
    </div>
  );
};
