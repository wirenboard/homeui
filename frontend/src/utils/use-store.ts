import { useRef } from 'react';

export const useStore = <T>(factory: () => T): T => {
  const ref = useRef<T | null>(null);

  if (!ref.current) {
    ref.current = factory();
  }

  return ref.current;
};
