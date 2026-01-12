import { useState, useCallback } from 'react';

type AsyncFunction<T extends any[], R> = (...args: T) => Promise<R>;

const MIN_LOADING_TIME = 300;

export const useAsyncAction = <T extends any[], R>(
  asyncFunction: AsyncFunction<T, R>
): [AsyncFunction<T, R>, boolean] => {
  const [isLoading, setIsLoading] = useState(false);

  const execute = useCallback(
    async (...args: T) => {
      const startTime = Date.now();

      setIsLoading(true);

      try {
        return await asyncFunction(...args);
      } finally {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, MIN_LOADING_TIME - elapsed);

        if (remaining > 0) {
          await new Promise((resolve) => setTimeout(resolve, remaining));
        }

        setIsLoading(false);
      }
    },
    [asyncFunction]
  );

  return [execute, isLoading];
};
