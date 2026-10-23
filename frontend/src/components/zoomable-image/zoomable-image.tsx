import classNames from 'classnames';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@/components/dialog';
import type { ImageState, ZoomableImageProps } from './types';
import './styles.css';

// Takes room only once loaded, a failed image just isn't there.
export const ZoomableImage = ({ src, alt, className }: ZoomableImageProps) => {
  const { t } = useTranslation();
  const [state, setState] = useState<ImageState>('loading');
  const [isZoomed, setIsZoomed] = useState(false);

  if (state === 'failed') {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className={classNames('zoomableImage', className, { 'zoomableImage-loading': state === 'loading' })}
        aria-label={t('common.buttons.zoom-picture')}
        onClick={() => setIsZoomed(true)}
      >
        <img src={src} alt={alt} onLoad={() => setState('loaded')} onError={() => setState('failed')} />
      </button>
      <Dialog isOpened={isZoomed} heading={alt} width={1000} onClose={() => setIsZoomed(false)}>
        <div className="zoomableImage-zoomed">
          <img src={src} alt={alt} />
        </div>
      </Dialog>
    </>
  );
};
