import { useState, useCallback, useRef } from 'react';

type AsyncFunction<T extends any[], R> = (...args: T) => Promise<R>;

const MIN_LOADING_TIME = 300;

export const useAsyncAction = <T extends any[], R>(
  asyncFunction: AsyncFunction<T, R>,
): [AsyncFunction<T, R>, boolean] => {
  const [isLoading, setIsLoading] = useState(false);
  // execute keeps one identity for the component's lifetime: a new one per render
  // would cascade into consumers' effects (the code editor rebuilding its extensions)
  const fnRef = useRef(asyncFunction);
  fnRef.current = asyncFunction;

  const execute = useCallback(
    async (...args: T) => {
      const startTime = Date.now();

      setIsLoading(true);

      try {
        return await fnRef.current(...args);
      } finally {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, MIN_LOADING_TIME - elapsed);

        if (remaining > 0) {
          await new Promise((resolve) => setTimeout(resolve, remaining));
        }

        setIsLoading(false);
      }
    },
    [],
  );

  return [execute, isLoading];
};
