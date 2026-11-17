import { useUploady } from '@rpldy/uploady';
import { Button } from '@/components/button';
import type { UploadButtonProps } from './types';

export const UploadButton = ({ label, variant, onClick, disabled }: UploadButtonProps) => {
  const uploady = useUploady();

  const onClickInternal = () => {
    uploady.showFileUpload();
    onClick?.();
  };

  return (
    <Button
      type="submit"
      disabled={disabled}
      label={label}
      variant={variant}
      onClick={onClickInternal}
    />
  );
};
