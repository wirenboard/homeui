import { useEffect, useState } from 'react';

export const getPathname = () => {
  const url = new URL(location.href);
  return decodeURIComponent(url.hash.split('/').pop());
};

const parseHash = () => {
  const hash = location.href.split('#!')[1] || '';
  const [path = '', queryString = ''] = hash.split('?');
  const arr = path.split('/').filter((item) => item);

  return {
    page: arr.length > 1 ? arr.slice(0, -1).join('/') || '' : arr.at(0),
    id: arr.length > 1 ? arr.at(-1) || '' : null,
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
