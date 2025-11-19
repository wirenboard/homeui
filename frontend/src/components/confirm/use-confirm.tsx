import { useState, useCallback } from 'react';

export const useConfirm = <T = true>() => {
  const [isOpened, setIsOpened] = useState(false);
  const [resolver, setResolver] = useState<(value: T | null) => void>();
  const [payload, setPayload] = useState<T | null>(null);

  const confirm = useCallback((data?: T) => {
    return new Promise<T | null>((resolve) => {
      setIsOpened(true);
      setPayload((data ?? true) as T);
      setResolver(() => resolve);
    });
  }, []);

  const handleConfirm = useCallback((data: T) => {
    resolver?.(data || payload);
    setIsOpened(false);
    setPayload(null);
  }, [resolver, payload]);

  const handleClose = useCallback(() => {
    resolver?.(null);
    setIsOpened(false);
    setPayload(null);
  }, [resolver]);

  return [
    confirm,
    isOpened,
    handleConfirm,
    handleClose,
    payload,
  ];
};
