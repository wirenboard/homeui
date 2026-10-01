import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export const useToggleFullscreen = (): [boolean, () => void] => {
  const [isFullscreen, setIsFullScreen] = useState(false);
  const [searchParams] = useSearchParams();

  if (searchParams.has('hmi') && searchParams.get('hmicolor') && document.querySelector('.defaultLayout-pageWrapper')) {
    document.getElementById('page-wrapper').style.background = searchParams.get('hmicolor');
  }

  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      (
        document.exitFullscreen ||
        document['webkitExitFullscreen'] ||
        document['mozCancelFullScreen'] ||
        document['msExitFullscreen']
      ).call(document);
    } else {
      (
        document.documentElement.requestFullscreen ||
        document.documentElement['webkitRequestFullscreen'] ||
        document.documentElement['mozRequestFullScreen'] ||
        document.documentElement['msRequestFullscreen']
      ).call(document.documentElement);
    }
  }, [isFullscreen]);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullScreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  });

  return [isFullscreen, toggleFullscreen];
};
