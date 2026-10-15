import { formatError } from '@/utils/format-error';
import type { TemplateErrorClassification } from './types';

const APPLY_PROBLEMS_PREFIX = 'apply-problems: ';

export const classifyTemplateError = (err: unknown): TemplateErrorClassification => {
  const data = (err as any)?.data;
  if (typeof data !== 'string') {
    return { kind: 'other' };
  }
  if (data === 'template-in-use') {
    return { kind: 'template-in-use' };
  }
  if (data.startsWith(APPLY_PROBLEMS_PREFIX)) {
    try {
      const problems = JSON.parse(data.slice(APPLY_PROBLEMS_PREFIX.length));
      return { kind: 'apply-problems', problems };
    } catch {
      return { kind: 'other' };
    }
  }
  return { kind: 'other' };
};

export const formatTemplateOperationError = (actionLabel: string, err: unknown): string =>
  `${actionLabel}: ${formatError(err)}`;

export const callWithForceOnTemplateInUse = async <T>(
  call: (force?: boolean) => Promise<T>,
  confirmForce: (classification: Exclude<TemplateErrorClassification, { kind: 'other' }>) => Promise<boolean>,
): Promise<{ forced: boolean; result: T } | undefined> => {
  try {
    return { forced: false, result: await call() };
  } catch (err) {
    const classification = classifyTemplateError(err);
    if (classification.kind === 'other') {
      throw err;
    }
    if (!(await confirmForce(classification))) {
      return undefined;
    }
    return { forced: true, result: await call(true) };
  }
};
