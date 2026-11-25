import { useEffect, useState } from 'react';
import { copyToClipboard } from '@/utils/clipboard';

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
