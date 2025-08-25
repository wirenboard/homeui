import { useCallback, useEffect, useState } from 'react';
import { parseHash } from '@/utils/url';

export const useToggleFullscreen = (): [boolean, () => void] => {
  const [isFullscreen, setIsFullScreen] = useState(false);
  const { params } = parseHash();

  if (params.get('hmi') && params.get('hmicolor')) {
    document.getElementById('page-wrapper').style.background = params.get('hmicolor');
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
