import { useEffect, useState } from 'react';

export const getPathname = () => {
  const url = new URL(location.href);
  return decodeURIComponent(url.hash.split('/').pop());
};

const parseHash = () => {
  const hash = location.href.split('#!')[1] || '';
  const [path = '', queryString = ''] = hash.split('?');
  return {
    page: path.split('/').at(-1) || '',
    params: new URLSearchParams(queryString),
  };
};

export function useParseHash() {
  const [state, setState] = useState(parseHash);

  useEffect(() => {
    const onHashChange = () => setState(parseHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return state;
}
