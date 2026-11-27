import { format, formatDistance } from 'date-fns';
import { enUS, ru } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { copyToClipboard } from '@/utils/clipboard';

/**
 * How this page writes a moment, in the language of the interface. Every moment the
 * bridge tells is on the clock of the controller, and the browser may be hours away from
 * it: "ago" is counted from `now`, which is that clock, never from the clock of the browser.
 *
 * - `ago(at)`     "5 minutes ago";
 * - `span(at)`    the same without "ago": "5 minutes", to stand inside a sentence;
 * - `day(at)`, `minute(at)`, `second(at)`  the moment itself, to that precision, in the
 *   format the rest of the interface uses;
 * - `longDay(at)` a day in words, with the year: "4 November 2026".
 */
export const useTimes = (now: number) => {
  const { i18n } = useTranslation();
  const isRussian = i18n.language === 'ru';
  const locale = isRussian ? ru : enUS;
  const dayFormat = isRussian ? 'dd.MM.yyyy' : 'dd/MM/yyyy';

  return {
    ago: (at: number) => formatDistance(at, now, { locale, addSuffix: true }),
    span: (at: number) => formatDistance(at, now, { locale }),
    day: (at: number) => format(at, dayFormat),
    minute: (at: number) => format(at, `${dayFormat}, HH:mm`),
    second: (at: number) => format(at, `${dayFormat}, HH:mm:ss`),
    longDay: (at: number) => format(at, 'd MMMM yyyy', { locale }),
  };
};

// How long a button says the copy was made before it offers to copy again.
const COPIED_MS = 2000;

/** Copies a text and says so for a moment: whether it has just copied, and the action. */
export const useCopy = (text: () => string) => {
  const [isCopied, setCopied] = useState(false);

  useEffect(() => {
    if (!isCopied) {
      return undefined;
    }
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [isCopied]);

  const copy = () => {
    copyToClipboard(text());
    setCopied(true);
  };

  return [isCopied, copy] as const;
};

/**
 * Which rows of a list are opened into their details. By the id of a row and not by its
 * place: a poll reorders nothing, but a row that leaves must not hand its open details
 * to the one below it.
 */
export const useOpened = () => {
  const [opened, setOpened] = useState<number[]>([]);
  const toggle = (id: number) => setOpened((before) => (
    before.includes(id) ? before.filter((one) => one !== id) : [...before, id]
  ));

  return [(id: number) => opened.includes(id), toggle] as const;
};
